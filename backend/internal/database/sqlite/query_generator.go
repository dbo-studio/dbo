package databaseSqlite

import (
	"database/sql"
	"slices"

	"github.com/samber/lo"
)

type Table struct {
	Name string `gorm:"column:tbl_name"`
}

func (r *SQLiteRepository) getAllTableList() ([]Table, error) {
	tables := make([]Table, 0)
	err := r.db.Table("sqlite_master").
		Select("tbl_name").
		Where("type = 'table'").
		Order("tbl_name").
		Scan(&tables).Error
	return tables, err
}

type View struct {
	Name string `gorm:"column:tbl_name"`
}

func (r *SQLiteRepository) getAllViewList() ([]View, error) {
	views := make([]View, 0)
	err := r.db.Table("sqlite_master").
		Select("tbl_name").
		Where("type = 'view'").
		Order("tbl_name").
		Scan(&views).Error
	return views, err
}

type Column struct {
	ColumnName    string         `gorm:"column:name"`
	DataType      string         `gorm:"column:type"`
	IsNullable    string         `gorm:"column:notnull"`
	ColumnDefault sql.NullString `gorm:"column:dflt_value"`
	IsPrimaryKey  string         `gorm:"column:pk"`
	MappedType    string         `gorm:"-"`
	Editable      bool           `gorm:"-"`
	IsActive      bool           `gorm:"-"`
}

func (r *SQLiteRepository) getColumns(table string, columnNames []string, editable bool) ([]Column, error) {
	columns := make([]Column, 0)
	err := r.db.Raw("PRAGMA table_info(" + table + ")").Scan(&columns).Error

	if err != nil {
		return nil, err
	}

	for i, column := range columns {
		//convert not_null to is_nullable
		if column.IsNullable == "0" {
			columns[i].IsNullable = "1"
		} else {
			columns[i].IsNullable = "0"
		}

		columns[i].MappedType = columnMappedFormat(column.DataType)
		columns[i].Editable = editable
		columns[i].IsActive = true
		if len(columnNames) > 0 {
			columns[i].IsActive = slices.Contains(columnNames, column.ColumnName)
		}
	}

	return columns, err
}

func (r *SQLiteRepository) getPrimaryKeys(table Table) ([]string, error) {
	columns, err := r.getColumns(table.Name, nil, false)
	if err != nil {
		return nil, err
	}

	primaryKeys := lo.Filter(columns, func(x Column, _ int) bool { return x.IsPrimaryKey == "1" })

	return lo.Map(primaryKeys, func(x Column, _ int) string { return x.ColumnName }), nil
}
