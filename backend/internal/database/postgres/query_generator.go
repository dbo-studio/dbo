package databasePostgres

import (
	"database/sql"
	"slices"
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

func (r *PostgresRepository) getAllSchemaList() ([]Schema, error) {
	schemas := make([]Schema, 0)
	err := r.db.Select("schema_name").
		Table("information_schema.schemata").
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
		Where("t.tablename != ''").
		Order("schema_name, table_name").
		Scan(&tables).Error
	return tables, err
}

func (r *PostgresRepository) getAllTableList() ([]Table, error) {
	tables := make([]Table, 0)
	err := r.db.Table("pg_namespace AS n").
		Select("n.nspname AS schema_name, t.tablename AS table_name").
		Joins("LEFT JOIN pg_tables t ON n.nspname = t.schemaname::name").
		Where("t.tablename != ''").
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

func (r *PostgresRepository) getAllViewList() ([]View, error) {
	views := make([]View, 0)
	err := r.db.Select("table_name").
		Table("information_schema.views").
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

type Column struct {
	OrdinalPosition        int32          `gorm:"column:ordinal_position"`
	ColumnName             string         `gorm:"column:column_name"`
	DataType               string         `gorm:"column:data_type"`
	IsNullable             string         `gorm:"column:is_nullable"`
	ColumnDefault          sql.NullString `gorm:"column:column_default"`
	CharacterMaximumLength sql.NullInt32  `gorm:"column:character_maximum_length"`
	Comment                sql.NullString `gorm:"column:column_comment"`
	MappedType             string         `gorm:"-"`
	Editable               bool           `gorm:"-"`
	IsActive               bool           `gorm:"-"`
}

func (r *PostgresRepository) getColumns(table string, schema string, columnNames []string, editable bool) ([]Column, error) {
	columns := make([]Column, 0)

	err := r.db.Table("information_schema.columns AS cols").
		Select("cols.ordinal_position, cols.column_name, cols.data_type, cols.is_nullable, cols.column_default, cols.character_maximum_length, des.description AS column_comment").
		Joins("LEFT JOIN pg_catalog.pg_description AS des ON (des.objoid = (SELECT c.oid FROM pg_catalog.pg_class AS c WHERE c.relname = cols.table_name LIMIT 1) AND des.objsubid = cols.ordinal_position)").
		Where("cols.table_schema = ? AND cols.table_name = ?", schema, table).
		Order("cols.ordinal_position").
		Scan(&columns).Error

	if err != nil {
		return nil, err
	}

	for i, column := range columns {
		columns[i].MappedType = columnMappedFormat(column.DataType)
		columns[i].Editable = editable
		columns[i].IsActive = true
		if len(columnNames) > 0 {
			columns[i].IsActive = slices.Contains(columnNames, column.ColumnName)
		}
	}

	return columns, err
}

type Template struct {
	Name string `gorm:"column:datname"`
}

func (r *PostgresRepository) getTemplates() ([]Template, error) {
	var templates []Template
	err := r.db.Table("pg_database").
		Select("datname").
		Where("datistemplate = true").
		Scan(&templates).Error

	return templates, err
}

func (r *PostgresRepository) getPrimaryKeys(table Table) ([]string, error) {
	var primaryKeys []string

	err := r.db.Table("information_schema.table_constraints AS tc").
		Select("kcu.column_name").
		Joins("JOIN information_schema.key_column_usage AS kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema").
		Where("tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = ?", table.Name).
		Scan(&primaryKeys).Error

	return primaryKeys, err
}
