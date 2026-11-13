package serviceAi

import (
	"fmt"
	"strings"

	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/contract"
	serviceAiChangeset "github.com/dbo-studio/dbo/internal/service/ai_changeset"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// previewNoSQLWrite is preview_write on a MongoDB or Redis connection: it reads what each statement would touch and
// adds the statements to the chat's changeset. Nothing runs until the user applies it.
func (s *AiServiceImpl) previewNoSQLWrite(ctx context.Context, chatID uint, rawArgs string, toolCtx serviceDbtools.ToolContext) (*previewWriteResult, error) {
	var args struct {
		Statements []string `json:"statements"`
		Statement  string   `json:"statement"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	statements := lo.Ternary(len(args.Statements) > 0, args.Statements, []string{args.Statement})
	statements = lo.Filter(statements, func(st string, _ int) bool { return strings.TrimSpace(st) != "" })

	switch {
	case len(statements) == 0:
		return nil, fmt.Errorf("statements is required")
	case len(statements) > maxWriteStatements:
		return nil, fmt.Errorf("at most %d statements fit in one change; split the work", maxWriteStatements)
	}

	previews := make([]*dto.WritePreviewResponse, 0, len(statements))

	for i, statement := range statements {
		class, err := s.nosqlService.ClassifyWrite(ctx, toolCtx.ConnectionID, statement)
		if class == databaseContract.SafetyBlocked {
			return nil, blockedError{fmt.Sprintf("statement %d is not allowed from DBO", i+1)}
		}

		if err != nil {
			return nil, fmt.Errorf("statement %d: %w", i+1, err)
		}

		preview, err := s.nosqlService.PreviewStatement(ctx, toolCtx.ConnectionID, statement)
		if err != nil {
			return nil, fmt.Errorf("statement %d: %w", i+1, err)
		}

		previews = append(previews, serviceAiChangeset.NoSQLPreviewResponse(statement, preview))
	}

	changeset, err := s.changesetService.Create(ctx, chatID, &dto.SchemaChangeRequest{
		ConnectionID: toolCtx.ConnectionID,
		Ops: lo.Map(previews, func(preview *dto.WritePreviewResponse, _ int) dto.SchemaChangeOp {
			return dto.SchemaChangeOp{Op: dto.SchemaChangeWrite, SQL: preview.SQL, AffectedRows: preview.AffectedRows}
		}),
	})
	if err != nil {
		return nil, err
	}

	return &previewWriteResult{Changeset: changeset, Previews: previews}, nil
}
