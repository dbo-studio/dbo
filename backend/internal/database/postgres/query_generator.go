package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

type Database struct {
	Name string `gorm:"column:datname"`
}

func (r *PostgresRepository) getDatabaseList() ([]Database, error) {
	databases := make([]Database, 0)
	r.db.Select("datname").
		Table("pg_database").
		Where("datistemplate = false").
		Find(&databases)

	err := r.db.Raw("SELECT datname FROM pg_database WHERE datistemplate = false").Scan(&databases).Error

	return databases, err
}

type Schema struct {
	Name string `gorm:"column:schema_name"`
}

func (r *PostgresRepository) getSchemaList(db Database) ([]Schema, error) {
	schemas := make([]Schema, 0)
	err := r.db.Select("schema_name").
		Table("information_schema.schemata").
		Where("catalog_name = ?", db.Name).
		//Where("schema_name NOT IN ('pg_catalog', 'information_schema')").
		Find(&schemas).Error

	return schemas, err
}

type Table struct {
	Name string `gorm:"column:table_name"`
}

func (r *PostgresRepository) getTableList(schema Schema) ([]Table, error) {
	tables := make([]Table, 0)
	err := r.db.Table("pg_namespace AS n").
		Select("n.nspname AS schema_name, t.tablename AS table_name").
		Joins("LEFT JOIN pg_tables t ON n.nspname = t.schemaname::name").
		Where("n.nspname = ?", schema.Name).
		Order("schema_name, table_name").
		Scan(&tables).Error
	return tables, err
}

type View struct {
	Name string `gorm:"column:table_name"`
}

func (r *PostgresRepository) getViewList(db Database, schema Schema) ([]View, error) {
	views := make([]View, 0)
	err := r.db.Select("table_name").
		Table("information_schema.views").
		Where("table_catalog = ? AND table_schema = ?", db.Name, schema.Name).
		Find(&views).Error

	return views, err
}

type MaterializedView struct {
	Name string `gorm:"column:matviewname"`
}

func (r *PostgresRepository) getMaterializedViewList(schema Schema) ([]MaterializedView, error) {
	mvs := make([]MaterializedView, 0)
	err := r.db.Select("matviewname").
		Table("pg_matviews").
		Where("schemaname = ?", schema.Name).
		Find(&mvs).Error

	return mvs, err
}

type Index struct {
	Name string `gorm:"column:indexname"`
}

func (r *PostgresRepository) getIndexList(schema Schema) ([]Index, error) {
	indexes := make([]Index, 0)
	err := r.db.Select("indexname").
		Table("pg_indexes").
		Where("schemaname = ?", schema.Name).
		Find(&indexes).Error

	return indexes, err
}

type Sequence struct {
	Name string `gorm:"column:sequencename"`
}

func (r *PostgresRepository) getSequenceList(schema Schema) ([]Sequence, error) {
	sequences := make([]Sequence, 0)
	err := r.db.Select("sequencename").
		Table("pg_sequences").
		Where("schemaname = ?", schema.Name).
		Find(&sequences).Error

	return sequences, err
}

func queryGenerator(dto *dto.RunQueryRequest, node PGNode) string {
	var sb strings.Builder

	// SELECT clause
	selectColumns := "*"
	if len(dto.Columns) > 0 {
		selectColumns = strings.Join(dto.Columns, ", ")
	}
	_, _ = fmt.Fprintf(&sb, "SELECT %s FROM %q", selectColumns, node.Table)

	// WHERE clause
	if len(dto.Filters) > 0 {
		sb.WriteString(" WHERE ")
		for i, filter := range dto.Filters {
			_, _ = fmt.Fprintf(&sb, "%s %s '%s'", filter.Column, filter.Operator, filter.Value)
			if i < len(dto.Filters)-1 {
				_, _ = fmt.Fprintf(&sb, " %s ", filter.Next)
			}
		}
	}

	// ORDER BY clause
	if len(dto.Sorts) > 0 {
		sb.WriteString(" ORDER BY ")
		sortClauses := make([]string, len(dto.Sorts))
		for i, sort := range dto.Sorts {
			sortClauses[i] = fmt.Sprintf("%s %s", sort.Column, sort.Operator)
		}
		sb.WriteString(strings.Join(sortClauses, ", "))
	}

	// LIMIT and OFFSET
	limit := 100
	if dto.Limit != nil && lo.FromPtr(dto.Limit) > 0 {
		limit = lo.FromPtr(dto.Limit)
	}
	_, _ = fmt.Fprintf(&sb, " LIMIT %d OFFSET %d;", limit, dto.Offset)

	return sb.String()
}
