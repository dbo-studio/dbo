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

// DiagramDiffData is the payload of a diagram_diff event and of a persisted
// diagram_diff chat message.
type DiagramDiffData struct {
	ChangesetID  string                    `json:"changesetId"`
	ConnectionID int32                     `json:"connectionId"`
	Database     string                    `json:"database,omitempty"`
	Schema       string                    `json:"schema,omitempty"`
	Ops          []dto.SchemaChangeOp      `json:"ops"`
	DiagramOps   []serviceSchema.DiagramOp `json:"diagramOps"`
}

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

// proposeSchemaChange validates the model's ops and turns them into a
// diagram changeset. It never touches the database: the user applies it via
// POST /schema/changes/apply.
func (s *AiServiceImpl) proposeSchemaChange(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (*DiagramDiffData, error) {
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

	return &DiagramDiffData{
		ChangesetID:  uuid.NewString(),
		ConnectionID: toolCtx.ConnectionID,
		Database:     database,
		Schema:       schema,
		Ops:          args.Ops,
		DiagramOps:   serviceSchema.ChangeDiagramOps(conn.ConnectionType, database, schema, args.Ops),
	}, nil
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
