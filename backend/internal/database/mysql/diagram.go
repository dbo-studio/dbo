package databaseMysql

import (
	"context"
	"fmt"
	"sort"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

type diagramColumnRow struct {
	TableName  string `gorm:"column:TABLE_NAME"`
	ColumnName string `gorm:"column:COLUMN_NAME"`
	DataType   string `gorm:"column:COLUMN_TYPE"`
	Ordinal    int32  `gorm:"column:ORDINAL_POSITION"`
}

type diagramPKRow struct {
	TableName  string `gorm:"column:TABLE_NAME"`
	ColumnName string `gorm:"column:COLUMN_NAME"`
}

type diagramFKRow struct {
	ConstraintName string `gorm:"column:CONSTRAINT_NAME"`
	SourceTable    string `gorm:"column:TABLE_NAME"`
	TargetTable    string `gorm:"column:REFERENCED_TABLE_NAME"`
	SourceColumn   string `gorm:"column:COLUMN_NAME"`
	TargetColumn   string `gorm:"column:REFERENCED_COLUMN_NAME"`
	UpdateAction   string `gorm:"column:UPDATE_RULE"`
	DeleteAction   string `gorm:"column:DELETE_RULE"`
}

func (r *MySQLRepository) Diagram(ctx context.Context, opts contract.DiagramOptions) (*contract.DiagramGraph, error) {
	database := strings.TrimSpace(lo.FromPtr(opts.Database))
	if database == "" {
		return nil, apperror.BadRequest(fmt.Errorf("database is required"))
	}

	seedTables := trimTableNames(opts.Tables)

	fks, err := r.diagramForeignKeys(ctx, database, seedTables)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	allow := expandMySQLDiagramTables(seedTables, fks)

	var (
		tables  []Table
		columns []diagramColumnRow
		pks     []diagramPKRow
	)

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		list, err := r.tables(gctx, &database, false)
		if err != nil {
			return err
		}

		tables = filterMySQLTablesByAllow(list, allow)

		return nil
	})

	g.Go(func() error {
		list, err := r.diagramColumns(gctx, database, allow)
		if err != nil {
			return err
		}

		columns = list

		return nil
	})

	g.Go(func() error {
		list, err := r.diagramPrimaryKeys(gctx, database, allow)
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
	groupedFKs := make(map[string]*contract.DiagramEdge)

	for _, fk := range fks {
		if allow != nil {
			if _, ok := allow[fk.SourceTable]; !ok {
				continue
			}
		}

		fkColSet[fk.SourceTable+"."+fk.SourceColumn] = struct{}{}

		sourceID := mysqlDiagramNodeID(database, fk.SourceTable)
		targetID := mysqlDiagramNodeID(database, fk.TargetTable)
		edgeKey := fk.ConstraintName + "." + fk.SourceTable

		edge, ok := groupedFKs[edgeKey]
		if !ok {
			edge = &contract.DiagramEdge{
				ID:            contract.DiagramEdgeID(fk.ConstraintName, sourceID, targetID),
				Source:        sourceID,
				Target:        targetID,
				SourceColumns: []string{},
				TargetColumns: []string{},
				OnUpdate:      fk.UpdateAction,
				OnDelete:      fk.DeleteAction,
			}
			groupedFKs[edgeKey] = edge
		}

		edge.SourceColumns = append(edge.SourceColumns, fk.SourceColumn)
		edge.TargetColumns = append(edge.TargetColumns, fk.TargetColumn)
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
	nodeIDs := make(map[string]struct{}, len(tables))

	for _, table := range tables {
		id := mysqlDiagramNodeID(database, table.Name)
		nodeIDs[id] = struct{}{}
		nodes = append(nodes, contract.DiagramNode{
			ID:       id,
			Kind:     contract.DiagramKindTable,
			Name:     table.Name,
			Database: database,
			Columns:  contract.OrEmptyColumns(colsByTable[table.Name]),
		})
	}

	edgeKeys := make([]string, 0, len(groupedFKs))
	for key := range groupedFKs {
		edgeKeys = append(edgeKeys, key)
	}

	sort.Strings(edgeKeys)

	edges := make([]contract.DiagramEdge, 0, len(groupedFKs))
	for _, key := range edgeKeys {
		edge := groupedFKs[key]
		if _, ok := nodeIDs[edge.Source]; !ok {
			continue
		}

		if _, ok := nodeIDs[edge.Target]; !ok {
			targetName := strings.TrimPrefix(edge.Target, database+".")
			targetCols := r.loadDiagramTableColumns(ctx, database, targetName, edge.TargetColumns)
			nodes = append(nodes, contract.DiagramNode{
				ID:       edge.Target,
				Kind:     contract.DiagramKindTable,
				Name:     targetName,
				Database: database,
				Columns:  contract.OrEmptyColumns(targetCols),
			})
			nodeIDs[edge.Target] = struct{}{}
		}

		edges = append(edges, *edge)
	}

	return &contract.DiagramGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

func mysqlDiagramNodeID(database, table string) string {
	return fmt.Sprintf("%s.%s", database, table)
}

func (r *MySQLRepository) loadDiagramTableColumns(
	ctx context.Context,
	database, table string,
	fkRefColumns []string,
) []contract.DiagramColumn {
	allow := map[string]struct{}{table: {}}

	loaded, err := r.diagramColumns(ctx, database, allow)
	if err != nil {
		return nil
	}

	pks, err := r.diagramPrimaryKeys(ctx, database, allow)
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

func (r *MySQLRepository) diagramColumns(ctx context.Context, database string, allow map[string]struct{}) ([]diagramColumnRow, error) {
	query := r.base.DB().WithContext(ctx).Table("information_schema.COLUMNS").
		Select("TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, ORDINAL_POSITION").
		Where("TABLE_SCHEMA = ?", database)

	if names := allowNames(allow); len(names) > 0 {
		query = query.Where("TABLE_NAME IN ?", names)
	}

	var columns []diagramColumnRow

	err := query.Order("TABLE_NAME, ORDINAL_POSITION").Find(&columns).Error
	if err != nil {
		return nil, err
	}

	return columns, nil
}

func (r *MySQLRepository) diagramPrimaryKeys(ctx context.Context, database string, allow map[string]struct{}) ([]diagramPKRow, error) {
	query := r.base.DB().WithContext(ctx).
		Table("information_schema.TABLE_CONSTRAINTS AS tc").
		Select("kcu.TABLE_NAME, kcu.COLUMN_NAME").
		Joins(`
			JOIN information_schema.KEY_COLUMN_USAGE AS kcu
				ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
				AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
				AND kcu.TABLE_NAME = tc.TABLE_NAME
		`).
		Where("tc.CONSTRAINT_TYPE = ?", "PRIMARY KEY").
		Where("tc.TABLE_SCHEMA = ?", database)

	if names := allowNames(allow); len(names) > 0 {
		query = query.Where("tc.TABLE_NAME IN ?", names)
	}

	var pks []diagramPKRow

	err := query.Order("kcu.TABLE_NAME, kcu.ORDINAL_POSITION").Find(&pks).Error
	if err != nil {
		return nil, err
	}

	return pks, nil
}

func (r *MySQLRepository) diagramForeignKeys(ctx context.Context, database string, seedTables []string) ([]diagramFKRow, error) {
	query := r.base.DB().WithContext(ctx).Table("information_schema.KEY_COLUMN_USAGE AS kcu").
		Select(`
			kcu.CONSTRAINT_NAME,
			kcu.TABLE_NAME,
			kcu.REFERENCED_TABLE_NAME,
			kcu.COLUMN_NAME,
			kcu.REFERENCED_COLUMN_NAME,
			rc.UPDATE_RULE,
			rc.DELETE_RULE
		`).
		Joins("JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA AND rc.TABLE_NAME = kcu.TABLE_NAME").
		Where("kcu.REFERENCED_TABLE_NAME IS NOT NULL").
		Where("kcu.TABLE_SCHEMA = ?", database)

	if len(seedTables) > 0 {
		query = query.Where("(kcu.TABLE_NAME IN ? OR kcu.REFERENCED_TABLE_NAME IN ?)", seedTables, seedTables)
	}

	var fks []diagramFKRow

	err := query.Order("kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION").Find(&fks).Error
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

func expandMySQLDiagramTables(seed []string, fks []diagramFKRow) map[string]struct{} {
	if len(seed) == 0 {
		return nil
	}

	allow := make(map[string]struct{}, len(seed)+len(fks))
	for _, name := range seed {
		allow[name] = struct{}{}
	}

	for _, fk := range fks {
		_, sourceOK := allow[fk.SourceTable]
		_, targetOK := allow[fk.TargetTable]

		if sourceOK || targetOK {
			allow[fk.SourceTable] = struct{}{}
			allow[fk.TargetTable] = struct{}{}
		}
	}

	return allow
}

func filterMySQLTablesByAllow(tables []Table, allow map[string]struct{}) []Table {
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
