package databasePostgres

import (
	"context"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

type diagramColumnRow struct {
	TableName  string `gorm:"column:table_name"`
	ColumnName string `gorm:"column:column_name"`
	DataType   string `gorm:"column:data_type"`
	Ordinal    int32  `gorm:"column:ordinal_position"`
}

type diagramPKRow struct {
	TableName  string `gorm:"column:table_name"`
	ColumnName string `gorm:"column:column_name"`
}

type diagramFKRow struct {
	ConstraintName string `gorm:"column:constraint_name"`
	SourceSchema   string `gorm:"column:source_schema"`
	SourceTable    string `gorm:"column:source_table"`
	TargetSchema   string `gorm:"column:target_schema"`
	TargetTable    string `gorm:"column:target_table"`
	Columns        string `gorm:"column:columns"`
	RefColumns     string `gorm:"column:ref_columns"`
	UpdateAction   string `gorm:"column:update_action"`
	DeleteAction   string `gorm:"column:delete_action"`
}

func (r *PostgresRepository) Diagram(ctx context.Context, opts contract.DiagramOptions) (*contract.DiagramGraph, error) {
	schema := strings.TrimSpace(lo.FromPtr(opts.Schema))
	if schema == "" {
		schema = "public"
	}

	database := strings.TrimSpace(lo.FromPtr(opts.Database))
	seedTables := trimTableNames(opts.Tables)

	fks, err := r.diagramForeignKeys(ctx, opts.Database, schema, seedTables)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	allow := expandDiagramTables(seedTables, schema, fks)

	var (
		tables  []Table
		columns []diagramColumnRow
		pks     []diagramPKRow
	)

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		list, err := r.tables(gctx, opts.Database, &schema, false)
		if err != nil {
			return err
		}

		tables = filterTablesByAllow(list, allow)

		return nil
	})

	g.Go(func() error {
		list, err := r.diagramColumns(gctx, opts.Database, schema, allow)
		if err != nil {
			return err
		}

		columns = list

		return nil
	})

	g.Go(func() error {
		list, err := r.diagramPrimaryKeys(gctx, opts.Database, schema, allow)
		if err != nil {
			return err
		}

		pks = list

		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, apperror.DriverError(err)
	}

	pkSet := make(map[string]struct{}, len(pks))
	for _, pk := range pks {
		pkSet[pk.TableName+"."+pk.ColumnName] = struct{}{}
	}

	fkColSet := make(map[string]struct{})

	for _, fk := range fks {
		if allow != nil {
			if _, ok := allow[fk.SourceTable]; !ok {
				continue
			}
		}

		for _, col := range splitIdentList(fk.Columns) {
			fkColSet[fk.SourceTable+"."+col] = struct{}{}
		}
	}

	colsByTable := make(map[string][]contract.DiagramColumn)

	for _, col := range columns {
		key := col.TableName + "." + col.ColumnName
		_, isPK := pkSet[key]
		_, isFK := fkColSet[key]
		colsByTable[col.TableName] = append(colsByTable[col.TableName], contract.DiagramColumn{
			Name:         col.ColumnName,
			DataType:     col.DataType,
			IsPrimaryKey: isPK,
			IsForeignKey: isFK,
		})
	}

	nodes := make([]contract.DiagramNode, 0, len(tables))
	nodeIDs := make(map[string]string, len(tables))

	for _, table := range tables {
		id := postgresDiagramNodeID(database, schema, table.Name)
		nodeIDs[schema+"."+table.Name] = id
		nodes = append(nodes, contract.DiagramNode{
			ID:       id,
			Kind:     contract.DiagramKindTable,
			Name:     table.Name,
			Schema:   schema,
			Database: database,
			Columns:  contract.OrEmptyColumns(colsByTable[table.Name]),
		})
	}

	edges := make([]contract.DiagramEdge, 0, len(fks))
	for _, fk := range fks {
		if allow != nil {
			if _, ok := allow[fk.SourceTable]; !ok {
				continue
			}
		}

		sourceID, sourceOK := nodeIDs[fk.SourceSchema+"."+fk.SourceTable]
		if !sourceOK {
			continue
		}

		targetKey := fk.TargetSchema + "." + fk.TargetTable
		targetID, targetOK := nodeIDs[targetKey]

		if !targetOK {
			targetCols := r.loadDiagramTableColumns(ctx, opts.Database, fk.TargetSchema, fk.TargetTable, splitIdentList(fk.RefColumns))
			targetID = postgresDiagramNodeID(database, fk.TargetSchema, fk.TargetTable)
			nodes = append(nodes, contract.DiagramNode{
				ID:       targetID,
				Kind:     contract.DiagramKindTable,
				Name:     fk.TargetTable,
				Schema:   fk.TargetSchema,
				Database: database,
				Columns:  contract.OrEmptyColumns(targetCols),
			})
			nodeIDs[targetKey] = targetID
		}

		edges = append(edges, contract.DiagramEdge{
			ID:            contract.DiagramEdgeID(fk.ConstraintName, sourceID, targetID),
			Source:        sourceID,
			Target:        targetID,
			SourceColumns: splitIdentList(fk.Columns),
			TargetColumns: splitIdentList(fk.RefColumns),
			OnUpdate:      fk.UpdateAction,
			OnDelete:      fk.DeleteAction,
		})
	}

	return &contract.DiagramGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

func postgresDiagramNodeID(database, schema, table string) string {
	if database == "" {
		return fmt.Sprintf("%s.%s", schema, table)
	}

	return fmt.Sprintf("%s.%s.%s", database, schema, table)
}

func (r *PostgresRepository) diagramColumns(ctx context.Context, database *string, schema string, allow map[string]struct{}) ([]diagramColumnRow, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_attribute AS a").
		Select(`
			c.relname AS table_name,
			a.attnum AS ordinal_position,
			a.attname AS column_name,
			format_type(a.atttypid, a.atttypmod) as data_type
		`).
		Joins("JOIN pg_class AS c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Where("a.attnum > 0").
		Where("NOT a.attisdropped").
		Where("c.relkind = ?", "r").
		Where("n.nspname = ?", schema)

	if names := allowNames(allow); len(names) > 0 {
		query = query.Where("c.relname IN ?", names)
	}

	var columns []diagramColumnRow

	err = query.Order("c.relname, a.attnum").Find(&columns).Error
	if err != nil {
		return nil, err
	}

	return columns, nil
}

func (r *PostgresRepository) diagramPrimaryKeys(ctx context.Context, database *string, schema string, allow map[string]struct{}) ([]diagramPKRow, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_index AS i").
		Select("c.relname AS table_name, a.attname AS column_name").
		Joins("JOIN pg_class AS c ON c.oid = i.indrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("JOIN pg_attribute AS a ON a.attrelid = c.oid AND a.attnum = ANY (i.indkey)").
		Where("i.indisprimary = true").
		Where("a.attnum > 0").
		Where("NOT a.attisdropped").
		Where("n.nspname = ?", schema)

	if names := allowNames(allow); len(names) > 0 {
		query = query.Where("c.relname IN ?", names)
	}

	var pks []diagramPKRow

	err = query.Order("c.relname, a.attnum").Find(&pks).Error
	if err != nil {
		return nil, err
	}

	return pks, nil
}

func (r *PostgresRepository) diagramForeignKeys(ctx context.Context, database *string, schema string, seedTables []string) ([]diagramFKRow, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_constraint c").
		Select(`
			c.conname as constraint_name,
			n.nspname as source_schema,
			t.relname as source_table,
			nt.nspname as target_schema,
			ct.relname as target_table,
			array_to_string(array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)), ', ') as columns,
			array_to_string(array_agg(af.attname ORDER BY array_position(c.confkey, af.attnum)), ', ') as ref_columns,
			CASE c.confupdtype
				WHEN 'a' THEN 'NO ACTION'
				WHEN 'r' THEN 'RESTRICT'
				WHEN 'c' THEN 'CASCADE'
				WHEN 'n' THEN 'SET NULL'
				WHEN 'd' THEN 'SET DEFAULT'
			END as update_action,
			CASE c.confdeltype
				WHEN 'a' THEN 'NO ACTION'
				WHEN 'r' THEN 'RESTRICT'
				WHEN 'c' THEN 'CASCADE'
				WHEN 'n' THEN 'SET NULL'
				WHEN 'd' THEN 'SET DEFAULT'
			END as delete_action
		`).
		Joins("JOIN pg_class t ON t.oid = c.conrelid").
		Joins("JOIN pg_class ct ON ct.oid = c.confrelid").
		Joins("JOIN pg_namespace n ON n.oid = t.relnamespace").
		Joins("JOIN pg_namespace nt ON nt.oid = ct.relnamespace").
		Joins("JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)").
		Joins("JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)").
		Where("c.contype = 'f'").
		Where("n.nspname = ?", schema)

	if len(seedTables) > 0 {
		query = query.Where("(t.relname IN ? OR ct.relname IN ?)", seedTables, seedTables)
	}

	var fks []diagramFKRow

	err = query.
		Group("c.conname, n.nspname, t.relname, nt.nspname, ct.relname, c.confupdtype, c.confdeltype, c.conkey, c.confkey").
		Order("c.conname").
		Find(&fks).Error
	if err != nil {
		return nil, err
	}

	return fks, nil
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

func (r *PostgresRepository) loadDiagramTableColumns(
	ctx context.Context,
	database *string,
	schema, table string,
	fkRefColumns []string,
) []contract.DiagramColumn {
	loaded, err := r.diagramColumns(ctx, database, schema, map[string]struct{}{table: {}})
	if err != nil {
		return nil
	}

	pks, err := r.diagramPrimaryKeys(ctx, database, schema, map[string]struct{}{table: {}})
	pkLocal := make(map[string]struct{}, len(pks))

	if err == nil {
		for _, pk := range pks {
			pkLocal[pk.TableName+"."+pk.ColumnName] = struct{}{}
		}
	}

	refCols := make(map[string]struct{}, len(fkRefColumns))
	for _, col := range fkRefColumns {
		refCols[col] = struct{}{}
	}

	out := make([]contract.DiagramColumn, 0, len(loaded))
	for _, col := range loaded {
		_, isPK := pkLocal[col.TableName+"."+col.ColumnName]
		_, isFK := refCols[col.ColumnName]
		out = append(out, contract.DiagramColumn{
			Name:         col.ColumnName,
			DataType:     col.DataType,
			IsPrimaryKey: isPK,
			IsForeignKey: isFK,
		})
	}

	return out
}

func expandDiagramTables(seed []string, schema string, fks []diagramFKRow) map[string]struct{} {
	if len(seed) == 0 {
		return nil
	}

	allow := make(map[string]struct{}, len(seed)+len(fks))
	for _, name := range seed {
		allow[name] = struct{}{}
	}

	for _, fk := range fks {
		_, sourceOK := allow[fk.SourceTable]
		targetOK := false

		if fk.TargetSchema == schema {
			_, targetOK = allow[fk.TargetTable]
		}

		if sourceOK && fk.TargetSchema == schema {
			allow[fk.TargetTable] = struct{}{}
		}

		if targetOK {
			allow[fk.SourceTable] = struct{}{}
		}
	}

	return allow
}

func filterTablesByAllow(tables []Table, allow map[string]struct{}) []Table {
	if allow == nil {
		return tables
	}

	out := make([]Table, 0, len(allow))
	for _, table := range tables {
		if _, ok := allow[table.Name]; ok {
			out = append(out, table)
		}
	}

	return out
}

func allowNames(allow map[string]struct{}) []string {
	if allow == nil {
		return nil
	}

	names := make([]string, 0, len(allow))
	for name := range allow {
		names = append(names, name)
	}

	return names
}

func splitIdentList(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}

	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name != "" {
			out = append(out, name)
		}
	}

	return out
}
