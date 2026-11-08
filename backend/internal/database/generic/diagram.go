package databaseGeneric

import (
	"context"
	"sort"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

const diagramTableLimit = 200

// Diagram draws the tables of one namespace and the foreign keys between them.
func (r *Repository) Diagram(ctx context.Context, opts contract.DiagramOptions) (*contract.DiagramGraph, error) {
	ns, err := r.resolveNamespace(ctx, opts.Database, opts.Schema)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	db := r.base.DB().WithContext(ctx)

	tables, err := r.d.Tables(ctx, db, ns)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	if len(opts.Tables) > 0 {
		tables = lo.Filter(tables, func(t string, _ int) bool { return lo.Contains(opts.Tables, t) })
	}

	if len(tables) > diagramTableLimit {
		tables = tables[:diagramTableLimit]
	}

	graph := &contract.DiagramGraph{Nodes: []contract.DiagramNode{}, Edges: []contract.DiagramEdge{}}

	for _, table := range tables {
		columns, err := r.d.Columns(ctx, db, ns, table)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		foreignKeys, err := r.d.ForeignKeys(ctx, db, ns, table)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		id := nodeID(ns, table)
		fkColumns := lo.Flatten(lo.Map(foreignKeys, func(fk ForeignKey, _ int) []string { return fk.Columns }))

		graph.Nodes = append(graph.Nodes, contract.DiagramNode{
			ID:   id,
			Kind: contract.DiagramKindTable,
			Name: table,
			Columns: contract.OrEmptyColumns(lo.Map(columns, func(c ColumnInfo, _ int) contract.DiagramColumn {
				return contract.DiagramColumn{Name: c.Name, DataType: c.DataType, IsPrimaryKey: c.IsPrimaryKey, IsForeignKey: lo.Contains(fkColumns, c.Name)}
			})),
		})

		for _, fk := range foreignKeys {
			target := nodeID(lo.Ternary(fk.RefSchema != "", fk.RefSchema, ns), fk.RefTable)
			graph.Edges = append(graph.Edges, contract.DiagramEdge{
				ID:            contract.DiagramEdgeID(fk.Name, id, target),
				Source:        id,
				Target:        target,
				SourceColumns: fk.Columns,
				TargetColumns: fk.RefColumns,
				OnUpdate:      fk.OnUpdate,
				OnDelete:      fk.OnDelete,
			})
		}
	}

	sort.Slice(graph.Nodes, func(i, j int) bool { return graph.Nodes[i].ID < graph.Nodes[j].ID })

	return graph, nil
}
