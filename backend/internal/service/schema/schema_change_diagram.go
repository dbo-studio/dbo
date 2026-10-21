package serviceSchema

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

// TableNodeID is the tree and diagram node id of a table.
func TableNodeID(connectionType, database, schema, table string) string {
	return databaseCore.FormatNodeID(connectionType, contract.DBNode{Database: database, Schema: schema, Table: table})
}

// ChangeDiagramOps maps schema change ops to diagram ops using the same node
// and edge ids the drivers emit for GET /schema/diagram.
func ChangeDiagramOps(connectionType, database, schema string, ops []dto.SchemaChangeOp) []dto.DiagramOp {
	nodeID := func(table string) string { return TableNodeID(connectionType, database, schema, table) }

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

	result := make([]dto.DiagramOp, 0, len(ops))

	for _, op := range ops {
		id := nodeID(op.Table)

		switch op.Op {
		case dto.SchemaChangeCreateTable:
			result = append(result, dto.DiagramOp{
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
			result = append(result, dto.DiagramOp{
				Op:     "add",
				Target: "column",
				ID:     op.Column.Name,
				NodeID: id,
				Value:  column(op.Table, *op.Column),
			})
		case dto.SchemaChangeAlterColumn:
			result = append(result, dto.DiagramOp{
				Op:     "change",
				Target: "column",
				ID:     op.Column.Name,
				NodeID: id,
				Patch:  map[string]any{"dataType": op.Column.Type, "isPrimaryKey": op.Column.Primary},
			})
		case dto.SchemaChangeDropColumn:
			result = append(result, dto.DiagramOp{Op: "remove", Target: "column", ID: op.ColumnName, NodeID: id})
		case dto.SchemaChangeRenameColumn:
			result = append(result, dto.DiagramOp{Op: "change", Target: "column", ID: op.ColumnName, NodeID: id, Patch: map[string]any{"name": op.Name}})
		case dto.SchemaChangeRenameTable:
			result = append(result, dto.DiagramOp{Op: "change", Target: "node", ID: id, Patch: map[string]any{"name": op.Name}})
		case dto.SchemaChangeDropTable:
			result = append(result, dto.DiagramOp{Op: "remove", Target: "node", ID: id})
		case dto.SchemaChangeAddForeignKey:
			targetID := nodeID(op.RefTable)
			edgeID := contract.DiagramEdgeID(op.ForeignKeyName(), id, targetID)
			result = append(result, dto.DiagramOp{
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
