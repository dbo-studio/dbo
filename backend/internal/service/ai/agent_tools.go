package serviceAi

import (
	"context"
	"errors"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/goccy/go-json"
	"github.com/google/uuid"
	"github.com/samber/lo"
)

// errToolBlocked marks a tool call refused by policy (mode or guardrail), as
// opposed to a tool that failed while running.
var errToolBlocked = errors.New("blocked")

type blockedError struct{ reason string }

func (e blockedError) Error() string { return e.reason }
func (e blockedError) Unwrap() error { return errToolBlocked }

// PermissionData is the payload of a permission_request event.
type PermissionData struct {
	RequestID    string `json:"requestId"`
	ConnectionID int32  `json:"connectionId"`
	Database     string `json:"database,omitempty"`
	Schema       string `json:"schema,omitempty"`
	SQL          string `json:"sql"`
	Class        string `json:"class"`
}

type proposeSchemaChangeArgs struct {
	Database *string              `json:"database"`
	Schema   *string              `json:"schema"`
	Ops      []dto.SchemaChangeOp `json:"ops"`
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

	if contract.IsPostgresFamily(conn.ConnectionType) && (database == "" || schema == "") {
		return nil, fmt.Errorf("database and schema are required; ask the user to select them in the chat context")
	}

	if contract.IsMysqlFamily(conn.ConnectionType) && database == "" {
		return nil, fmt.Errorf("database is required; ask the user to select it in the chat context")
	}

	if !contract.IsPostgresFamily(conn.ConnectionType) {
		schema = ""
	}

	if conn.ConnectionType == string(contract.Sqlite) {
		database = ""
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

// requestWrite classifies a write statement and turns it into a permission
// request. It never executes: the user confirms via POST /query/raw, which
// enforces Safe Mode.
func requestWrite(rawArgs string, toolCtx serviceDbtools.ToolContext) (*PermissionData, error) {
	var args struct {
		SQL string `json:"sql"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	classification := sqlguard.ClassifySQL(args.SQL)

	switch {
	case len(classification.Statements) != 1:
		return nil, blockedError{"exactly one statement is allowed per request"}
	case classification.Class == sqlguard.ClassRead:
		return nil, fmt.Errorf("this is a read-only statement; use %s instead", serviceDbtools.ToolExecuteSQL)
	case classification.Class == sqlguard.ClassDangerousDML:
		return nil, blockedError{"UPDATE/DELETE without WHERE is not allowed"}
	case classification.Class == sqlguard.ClassCatastrophicDDL:
		return nil, blockedError{"destructive DDL (DROP/TRUNCATE) is not allowed from the agent; the user must run it manually"}
	case classification.Class == sqlguard.ClassUnknown:
		return nil, blockedError{"statement could not be classified"}
	}

	return &PermissionData{
		RequestID:    uuid.NewString(),
		ConnectionID: toolCtx.ConnectionID,
		Database:     lo.FromPtr(toolCtx.Database),
		Schema:       lo.FromPtr(toolCtx.Schema),
		SQL:          classification.Statements[0],
		Class:        string(classification.Class),
	}, nil
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
