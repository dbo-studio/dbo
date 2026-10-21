package serviceAiChangeset

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceSchema "github.com/dbo-studio/dbo/internal/service/schema"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

func decodeOps(rows []*model.AiChangesetOp) ([]dto.SchemaChangeOp, error) {
	ops := make([]dto.SchemaChangeOp, len(rows))

	for i, row := range rows {
		if err := json.Unmarshal([]byte(row.OpJSON), &ops[i]); err != nil {
			return nil, err
		}
	}

	return ops, nil
}

// changesetToResponse maps a stored changeset. The diagram overlay only shows
// ops that still wait for the user: rejected ones never happen and applied ones
// are already part of the live schema.
func changesetToResponse(changeset *model.AiChangeset, connectionType string) (*dto.AiChangesetResponse, error) {
	rows := lo.Map(changeset.Ops, func(_ model.AiChangesetOp, i int) *model.AiChangesetOp { return &changeset.Ops[i] })

	ops, err := decodeOps(rows)
	if err != nil {
		return nil, err
	}

	var open, applied []dto.SchemaChangeOp

	for i, row := range rows {
		switch row.Status {
		case model.AiChangesetOpApplied:
			applied = append(applied, ops[i])
		case model.AiChangesetOpRejected:
		default:
			open = append(open, ops[i])
		}
	}

	return &dto.AiChangesetResponse{
		ID:           changeset.ID,
		ChatID:       changeset.ChatID,
		ConnectionID: int32(changeset.ConnectionID),
		Database:     changeset.Database,
		Schema:       changeset.Schema,
		Ops: lo.Map(rows, func(row *model.AiChangesetOp, i int) dto.AiChangesetOp {
			return dto.AiChangesetOp{
				Position:       row.Position,
				Status:         string(row.Status),
				Error:          row.Error,
				TableID:        serviceSchema.TableNodeID(connectionType, changeset.Database, changeset.Schema, ops[i].Table),
				SchemaChangeOp: ops[i],
			}
		}),
		DiagramOps: serviceSchema.ChangeDiagramOps(connectionType, changeset.Database, changeset.Schema, open),
		UndoSQL:    serviceSchema.CompensatingSQL(connectionType, changeset.Database, changeset.Schema, applied),
	}, nil
}

// opLabel is a short description of an op for the agent prompt.
func opLabel(op dto.SchemaChangeOp) string {
	switch op.Op {
	case dto.SchemaChangeWrite, dto.SchemaChangeUndo:
		return op.Op + " " + strings.TrimSpace(op.SQL)
	case dto.SchemaChangeCreateDatabase, dto.SchemaChangeCreateSchema:
		return op.Op + " " + op.Name
	case dto.SchemaChangeAddColumn, dto.SchemaChangeAlterColumn:
		return op.Op + " " + op.Table + "." + op.Column.Name
	case dto.SchemaChangeDropColumn:
		return op.Op + " " + op.Table + "." + op.ColumnName
	case dto.SchemaChangeAddIndex:
		return op.Op + " " + op.Table + "(" + strings.Join(op.IndexColumns, ", ") + ")"
	default:
		return op.Op + " " + op.Table
	}
}

// isOpenStatus reports whether an op still waits for the user: not rejected, not applied.
func isOpenStatus(status model.AiChangesetOpStatus) bool {
	return status != model.AiChangesetOpRejected && status != model.AiChangesetOpApplied
}
