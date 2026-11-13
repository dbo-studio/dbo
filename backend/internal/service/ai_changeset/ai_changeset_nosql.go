package serviceAiChangeset

import (
	"context"
	"regexp"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

// On MongoDB and Redis a change is a statement: a "write" op holds it in SQL, and the statements that put things back
// are "undo" ops. Everything else (review, edit, tiers, audit) is shared with the SQL flow.

// undoSeparator joins the several statements that undo one write into the single UndoSQL column.
const undoSeparator = "\n-- next --\n"

// nosqlStructure matches the statements that change a collection's structure rather than its documents.
var nosqlStructure = regexp.MustCompile(`\.(createIndex|dropIndex|dropIndexes|createCollection|drop|renameCollection)\(|\bdb\.createCollection\(`)

func isNoSQLStructure(statement string) bool { return nosqlStructure.MatchString(statement) }

func (s IAiChangesetServiceImpl) isNoSQL(ctx context.Context, connectionID uint) bool {
	conn, err := s.connectionRepo.Find(ctx, int32(connectionID))

	return err == nil && contract.IsNoSQL(conn.ConnectionType)
}

// nosqlPreviewOp reads what one write statement would touch, shaped like a SQL write preview so the same card shows it.
func (s IAiChangesetServiceImpl) nosqlPreviewOp(ctx context.Context, changeset *model.AiChangeset, statement string) (*dto.WritePreviewResponse, error) {
	preview, err := s.nosql.PreviewStatement(ctx, int32(changeset.ConnectionID), statement)
	if err != nil {
		return nil, err
	}

	return NoSQLPreviewResponse(statement, preview), nil
}

// NoSQLPreviewResponse shapes a preview of a MongoDB or Redis write like a SQL write preview.
func NoSQLPreviewResponse(statement string, preview *contract.WritePreview) *dto.WritePreviewResponse {
	// An update that can be simulated shows each changed field with its value before and after.
	if len(preview.Diff) > 0 {
		rows := make([]map[string]any, 0, len(preview.Diff))
		for _, d := range preview.Diff {
			rows = append(rows, map[string]any{"document": d.ID, "field": d.Field, "before": lo.Ternary(d.Before == "", "(none)", d.Before), "after": lo.Ternary(d.After == "", "(removed)", d.After)})
		}

		return &dto.WritePreviewResponse{SQL: statement, AffectedRows: preview.Affected, Columns: []string{"document", "field", "before", "after"}, Rows: rows}
	}

	rows := make([]map[string]any, 0, len(preview.Sample))
	for _, line := range preview.Sample {
		rows = append(rows, map[string]any{"value": line})
	}

	return &dto.WritePreviewResponse{SQL: statement, AffectedRows: preview.Affected, Columns: []string{"value"}, Rows: rows}
}

// applyNoSQL runs the open ops one after another and stops at the first that fails; nothing here is transactional.
func (s IAiChangesetServiceImpl) applyNoSQL(
	ctx context.Context,
	changeset *model.AiChangeset,
	req *dto.SchemaChangeRequest,
	open []*model.AiChangesetOp,
	confirmed bool,
) (*dto.AiChangesetResponse, error) {
	statements := lo.Map(req.Ops, func(op dto.SchemaChangeOp, _ int) string { return op.SQL })
	result := &serviceSchema.ChangeResult{}

	if err := s.nosql.RequireConfirmed(ctx, int32(changeset.ConnectionID), statements, confirmed); err != nil {
		s.audit(ctx, changeset, open, statements, nil, err)

		return nil, err
	}

	var applyErr error

	touched := make([]model.AiChangesetOp, 0, len(open))

	for i, op := range req.Ops {
		undo, note, err := s.nosql.ApplyStatement(ctx, int32(changeset.ConnectionID), op.SQL, confirmed)
		if err != nil {
			applyErr = err
			result.Failed = append(result.Failed, i)

			break
		}

		result.Applied = append(result.Applied, i)
		open[i].Status, open[i].Error = model.AiChangesetOpApplied, ""
		open[i].UndoSQL, open[i].UndoNote = strings.Join(undo, undoSeparator), note
		touched = append(touched, *open[i])
	}

	// Nothing ran: a Safe Mode prompt or a refusal is the caller's answer, and the ops stay as they were.
	if len(result.Applied) == 0 {
		s.audit(ctx, changeset, open, statements, nil, applyErr)

		return nil, applyErr
	}

	for _, i := range result.Failed {
		open[i].Status, open[i].Error = model.AiChangesetOpFailed, applyErr.Error()
		touched = append(touched, *open[i])
	}

	if err := s.aiChangesetRepo.SaveOps(context.WithoutCancel(ctx), touched); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.audit(ctx, changeset, open, statements, result, applyErr)

	return s.response(ctx, changeset)
}

// nosqlUndoStatements lists the statements that take back a changeset's applied writes. The writes ran in order,
// so they are taken back newest first; the statements that undo one write keep their own order.
func nosqlUndoStatements(changeset *model.AiChangeset) []string {
	var out []string

	for i := len(changeset.Ops) - 1; i >= 0; i-- {
		op := changeset.Ops[i]
		if op.Status != model.AiChangesetOpApplied || op.UndoSQL == "" {
			continue
		}

		out = append(out, strings.Split(op.UndoSQL, undoSeparator)...)
	}

	return out
}

// allowedNoSQLByTier is the tier check for statements: read-only allows nothing, data_write allows document and key
// writes but not structure changes (indexes, collections).
func allowedNoSQLByTier(tier model.AgentTier, ops []dto.SchemaChangeOp) error {
	switch tier {
	case model.AgentTierReadOnly:
		return apperror.Forbidden(errTierReadOnly)
	case model.AgentTierDataWrite:
		if lo.SomeBy(ops, func(op dto.SchemaChangeOp) bool { return isNoSQLStructure(op.SQL) }) {
			return apperror.Forbidden(errTierSchema)
		}
	}

	return nil
}
