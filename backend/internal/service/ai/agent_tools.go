package serviceAi

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// errToolBlocked marks a tool call refused by policy (mode or guardrail), as
// opposed to a tool that failed while running.
var errToolBlocked = errors.New("blocked")

type blockedError struct{ reason string }

func (e blockedError) Error() string { return e.reason }
func (e blockedError) Unwrap() error { return errToolBlocked }

type proposeSchemaChangeArgs struct {
	Database *string              `json:"database"`
	Schema   *string              `json:"schema"`
	Ops      []dto.SchemaChangeOp `json:"ops"`
}

// scope is the database and schema a proposal works in on this engine; the
// ones the engine has no use for are dropped, the ones it needs must be chosen.
func scope(connectionType, database, schema string) (string, string, error) {
	if contract.IsPostgresFamily(connectionType) && (database == "" || schema == "") {
		return "", "", fmt.Errorf("database and schema are required; ask the user to select them in the chat context")
	}

	if contract.IsMysqlFamily(connectionType) && database == "" {
		return "", "", fmt.Errorf("database is required; ask the user to select it in the chat context")
	}

	if !contract.IsPostgresFamily(connectionType) {
		schema = ""
	}

	if connectionType == string(contract.Sqlite) {
		database = ""
	}

	return database, schema, nil
}

// proposeSchemaChange validates the model's ops and stores them as a pending
// changeset of the chat. It never touches the database: the user reviews the
// changeset and applies it through the changeset endpoints.
func (s *AiServiceImpl) proposeSchemaChange(ctx context.Context, chatID uint, rawArgs string, toolCtx serviceDbtools.ToolContext) (*dto.AiChangesetResponse, error) {
	var args proposeSchemaChangeArgs
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	conn, err := s.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("connection not found")
	}

	database := lo.CoalesceOrEmpty(lo.FromPtr(args.Database), lo.FromPtr(toolCtx.Database))
	schema := lo.CoalesceOrEmpty(lo.FromPtr(args.Schema), lo.FromPtr(toolCtx.Schema))

	if err := serviceSchema.ValidateScopeOps(conn.ConnectionType, args.Ops); err != nil {
		return nil, err
	}

	// Data changes go through preview_write, and undo SQL is only ever derived by the server.
	for _, op := range args.Ops {
		if op.Op == dto.SchemaChangeWrite || op.Op == dto.SchemaChangeUndo {
			return nil, fmt.Errorf("op %q cannot be proposed here; use preview_write for data changes", op.Op)
		}
	}

	// Tables proposed together with a new database or schema go inside it.
	for _, op := range args.Ops {
		switch op.Op {
		case dto.SchemaChangeCreateDatabase:
			database = op.Name
			schema = lo.If(contract.IsPostgresFamily(conn.ConnectionType), lo.CoalesceOrEmpty(schema, "public")).Else("")
		case dto.SchemaChangeCreateSchema:
			schema = op.Name
		}
	}

	database, schema, err = scope(conn.ConnectionType, database, schema)
	if err != nil {
		return nil, err
	}

	req := dto.SchemaChangeRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     lo.EmptyableToPtr(database),
		Schema:       lo.EmptyableToPtr(schema),
		Ops:          args.Ops,
	}
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid ops: %w", err)
	}

	return s.changesetService.Create(ctx, chatID, &req)
}

// updatePlan validates the agent's checklist so it can be shown and stored.
func updatePlan(rawArgs string) (*dto.AiPlan, error) {
	var plan dto.AiPlan
	if err := json.Unmarshal([]byte(rawArgs), &plan); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	if err := plan.Validate(); err != nil {
		return nil, fmt.Errorf("invalid plan: %w", err)
	}

	return &plan, nil
}

// previewWriteResult is what the model learns about a data change it previewed.
type previewWriteResult struct {
	Changeset *dto.AiChangesetResponse
	Previews  []*dto.WritePreviewResponse
}

const (
	// maxWriteStatements bounds one batch of data changes.
	maxWriteStatements = 20
	// maxSeedRows bounds the rows one INSERT may add, so seed data stays a sample.
	maxSeedRows = 1000
)

// previewWrite counts the rows a data change touches, without changing
// anything, and adds the statement to the chat's changeset. The user applies it.
func (s *AiServiceImpl) previewWrite(ctx context.Context, chatID uint, rawArgs string, toolCtx serviceDbtools.ToolContext) (*previewWriteResult, error) {
	var args struct {
		SQL        string   `json:"sql"`
		Statements []string `json:"statements"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	statements := lo.Ternary(len(args.Statements) > 0, args.Statements, []string{args.SQL})
	if len(statements) > maxWriteStatements {
		return nil, fmt.Errorf("at most %d statements fit in one change; split the work", maxWriteStatements)
	}

	for i, statement := range statements {
		if _, err := sqlguard.WriteStatement(statement); err != nil {
			if len(statements) > 1 {
				err = fmt.Errorf("statement %d: %w", i+1, err)
			}

			if errors.Is(err, sqlguard.ErrBlocked) {
				return nil, blockedError{strings.Replace(err.Error(), "blocked: ", "", 1)}
			}

			return nil, err
		}
	}

	conn, err := s.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("connection not found")
	}

	database, schema, err := scope(conn.ConnectionType, lo.FromPtr(toolCtx.Database), lo.FromPtr(toolCtx.Schema))
	if err != nil {
		return nil, err
	}

	previews, err := s.schemaService.PreviewWrites(ctx, &dto.WritePreviewRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     lo.EmptyableToPtr(database),
		Schema:       lo.EmptyableToPtr(schema),
	}, statements)
	if err != nil {
		return nil, err
	}

	for i, preview := range previews {
		if target, ok := sqlguard.ParseWriteTarget(preview.SQL); ok && target.Kind == "INSERT" && preview.AffectedRows > maxSeedRows {
			return nil, fmt.Errorf("statement %d inserts %d rows; insert at most %d rows per statement", i+1, preview.AffectedRows, maxSeedRows)
		}
	}

	changeset, err := s.changesetService.Create(ctx, chatID, &dto.SchemaChangeRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     lo.EmptyableToPtr(database),
		Schema:       lo.EmptyableToPtr(schema),
		Ops: lo.Map(previews, func(preview *dto.WritePreviewResponse, _ int) dto.SchemaChangeOp {
			return dto.SchemaChangeOp{Op: dto.SchemaChangeWrite, SQL: preview.SQL, AffectedRows: preview.AffectedRows}
		}),
	})
	if err != nil {
		return nil, err
	}

	return &previewWriteResult{Changeset: changeset, Previews: previews}, nil
}

// ToolTrace is the persisted/streamed record of one tool call.
type ToolTrace struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Args       string `json:"args,omitempty"`
	Status     string `json:"status"`
	Result     string `json:"result,omitempty"`
	Error      string `json:"error,omitempty"`
	DurationMs int64  `json:"durationMs"`
}

func traceMessage(msgType model.AiChatMessageType, payload any) model.AiChatMessage {
	raw, _ := json.Marshal(payload)

	return model.AiChatMessage{
		Role:     model.AiChatMessageRoleAssistant,
		Content:  string(raw),
		Type:     msgType,
		Language: model.AiChatMessageLanguageJSON,
	}
}

func truncate(s string, limit int) string {
	if len(s) <= limit {
		return s
	}

	return s[:limit] + "…"
}

func streamEvent(eventType string, id string, data any) aiProvider.StreamEvent {
	return aiProvider.StreamEvent{Type: eventType, ID: id, Data: data}
}
