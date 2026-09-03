package databaseSqlite

import (
	"context"
	"strconv"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (r *SQLiteRepository) Diagram(ctx context.Context, opts contract.DiagramOptions) (*contract.DiagramGraph, error) {
	tables, err := r.getAllTableList(ctx)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	seed := trimTableNames(opts.Tables)
	allow := seedAllowSet(seed)

	// First pass: collect FKs for seed expansion (and optionally all tables when unfiltered).
	type tableFKs struct {
		name string
		fks  []ForeignKey
	}

	pending := make([]tableFKs, 0, len(tables))
	for _, table := range tables {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if isSQLiteSystemTable(table.Name) {
			continue
		}

		if allow != nil {
			if _, ok := allow[table.Name]; !ok {
				// Still need FK scan for tables that reference a seed table.
				fks, fkErr := r.foreignKeys(ctx, table.Name)
				if fkErr != nil {
					return nil, apperror.DriverError(fkErr)
				}

				for _, fk := range fks {
					if _, targetOK := allow[fk.TargetTable]; targetOK {
						allow[table.Name] = struct{}{}
						pending = append(pending, tableFKs{name: table.Name, fks: fks})

						break
					}
				}

				continue
			}
		}

		fks, fkErr := r.foreignKeys(ctx, table.Name)
		if fkErr != nil {
			return nil, apperror.DriverError(fkErr)
		}

		if allow != nil {
			for _, fk := range fks {
				allow[fk.TargetTable] = struct{}{}
			}
		}

		pending = append(pending, tableFKs{name: table.Name, fks: fks})
	}

	// Include newly allowed targets that were skipped in the first pass.
	if allow != nil {
		have := make(map[string]struct{}, len(pending))
		for _, item := range pending {
			have[item.name] = struct{}{}
		}

		for _, table := range tables {
			if isSQLiteSystemTable(table.Name) {
				continue
			}

			if _, ok := allow[table.Name]; !ok {
				continue
			}

			if _, ok := have[table.Name]; ok {
				continue
			}

			fks, fkErr := r.foreignKeys(ctx, table.Name)
			if fkErr != nil {
				return nil, apperror.DriverError(fkErr)
			}

			pending = append(pending, tableFKs{name: table.Name, fks: fks})
		}
	}

	nodes := make([]contract.DiagramNode, 0, len(pending))
	edges := make([]contract.DiagramEdge, 0)
	nodeIDs := make(map[string]struct{})

	for _, item := range pending {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		cols, colErr := r.getColumns(ctx, item.name, nil, false)
		if colErr != nil {
			return nil, apperror.DriverError(colErr)
		}

		diagramCols := make([]contract.DiagramColumn, 0, len(cols))
		for _, col := range cols {
			diagramCols = append(diagramCols, contract.DiagramColumn{
				Name:         col.ColumnName,
				DataType:     col.DataType,
				IsPrimaryKey: sqliteColumnIsPrimaryKey(col.IsPrimaryKey),
				IsForeignKey: col.IsForeignKey,
			})
		}

		nodes = append(nodes, contract.DiagramNode{
			ID:      item.name,
			Kind:    contract.DiagramKindTable,
			Name:    item.name,
			Columns: diagramCols,
		})
		nodeIDs[item.name] = struct{}{}

		for _, fk := range item.fks {
			if allow != nil {
				if _, ok := allow[item.name]; !ok {
					continue
				}
			}

			edges = append(edges, contract.DiagramEdge{
				ID:            contract.DiagramEdgeID(fk.ConstraintName, item.name, fk.TargetTable),
				Source:        item.name,
				Target:        fk.TargetTable,
				SourceColumns: append([]string(nil), fk.Columns...),
				TargetColumns: append([]string(nil), fk.RefColumns...),
				OnUpdate:      fk.UpdateAction,
				OnDelete:      fk.DeleteAction,
			})
		}
	}

	for _, edge := range edges {
		if _, ok := nodeIDs[edge.Target]; ok {
			continue
		}

		targetCols := r.loadSQLiteDiagramColumns(ctx, edge.Target)
		nodes = append(nodes, contract.DiagramNode{
			ID:      edge.Target,
			Kind:    contract.DiagramKindTable,
			Name:    edge.Target,
			Columns: contract.OrEmptyColumns(targetCols),
		})
		nodeIDs[edge.Target] = struct{}{}
	}

	return &contract.DiagramGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

func (r *SQLiteRepository) loadSQLiteDiagramColumns(ctx context.Context, table string) []contract.DiagramColumn {
	cols, err := r.getColumns(ctx, table, nil, false)
	if err != nil {
		return nil
	}

	out := make([]contract.DiagramColumn, 0, len(cols))
	for _, col := range cols {
		out = append(out, contract.DiagramColumn{
			Name:         col.ColumnName,
			DataType:     col.DataType,
			IsPrimaryKey: sqliteColumnIsPrimaryKey(col.IsPrimaryKey),
			IsForeignKey: col.IsForeignKey,
		})
	}

	return out
}

func trimTableNames(tables []string) []string {
	if len(tables) == 0 {
		return nil
	}

	out := make([]string, 0, len(tables))
	for _, table := range tables {
		name := strings.TrimSpace(table)
		if name != "" {
			out = append(out, name)
		}
	}

	return out
}

func seedAllowSet(seed []string) map[string]struct{} {
	if len(seed) == 0 {
		return nil
	}

	allow := make(map[string]struct{}, len(seed))
	for _, name := range seed {
		allow[name] = struct{}{}
	}

	return allow
}

func sqliteColumnIsPrimaryKey(pk string) bool {
	n, err := strconv.Atoi(strings.TrimSpace(pk))
	if err == nil {
		return n > 0
	}

	return pk != "" && pk != "0" && !strings.EqualFold(pk, "false")
}
