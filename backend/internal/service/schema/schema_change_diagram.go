package serviceSchema

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

// DiagramOp mirrors the frontend SchemaOp (core/diagram/types.ts) so a
// proposed changeset can be overlaid on the diagram with applyOps.
type DiagramOp struct {
	Op     string `json:"op"`
	Target string `json:"target"`
	ID     string `json:"id"`
	NodeID string `json:"nodeId,omitempty"`
	Value  any    `json:"value"`
}

// ChangeDiagramOps maps schema change ops to diagram ops using the same node
// and edge ids the drivers emit for GET /schema/diagram.
func ChangeDiagramOps(connectionType, database, schema string, ops []dto.SchemaChangeOp) []DiagramOp {
	nodeID := func(table string) string {
		return databaseCore.FormatNodeID(connectionType, contract.DBNode{Database: database, Schema: schema, Table: table})
	}

	fkColumns := map[string]map[string]bool{}

	for _, op := range ops {
		if op.Op != dto.SchemaChangeAddForeignKey {
			continue
		}

		if fkColumns[op.Table] == nil {
			fkColumns[op.Table] = map[string]bool{}
		}

		for _, col := range op.FkColumns {
			fkColumns[op.Table][col] = true
		}
	}

	column := func(table string, col dto.SchemaChangeColumn) contract.DiagramColumn {
		return contract.DiagramColumn{
			Name:         col.Name,
			DataType:     col.Type,
			IsPrimaryKey: col.Primary,
			IsForeignKey: fkColumns[table][col.Name],
		}
	}

	result := make([]DiagramOp, 0, len(ops))

	for _, op := range ops {
		id := nodeID(op.Table)

		switch op.Op {
		case dto.SchemaChangeCreateTable:
			result = append(result, DiagramOp{
				Op:     "add",
				Target: "node",
				ID:     id,
				Value: contract.DiagramNode{
					ID:       id,
					Kind:     "table",
					Name:     op.Table,
					Schema:   schema,
					Database: database,
					Columns: lo.Map(op.Columns, func(col dto.SchemaChangeColumn, _ int) contract.DiagramColumn {
						return column(op.Table, col)
					}),
				},
			})
		case dto.SchemaChangeAddColumn:
			result = append(result, DiagramOp{
				Op:     "add",
				Target: "column",
				ID:     op.Column.Name,
				NodeID: id,
				Value:  column(op.Table, *op.Column),
			})
		case dto.SchemaChangeAddForeignKey:
			targetID := nodeID(op.RefTable)
			edgeID := contract.DiagramEdgeID(op.ForeignKeyName(), id, targetID)
			result = append(result, DiagramOp{
				Op:     "add",
				Target: "edge",
				ID:     edgeID,
				Value: contract.DiagramEdge{
					ID:            edgeID,
					Source:        id,
					Target:        targetID,
					SourceColumns: op.FkColumns,
					TargetColumns: op.RefColumns,
					OnDelete:      op.OnDelete,
				},
			})
		}
	}

	return result
}
