package databaseSqlite

import (
	"context"
	"database/sql"
	"fmt"
	"slices"
	"strings"

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

type ViewBasic struct {
	Name string `gorm:"column:tbl_name"`
}

func (r *SQLiteRepository) getAllViewList() ([]ViewBasic, error) {
	views := make([]ViewBasic, 0)
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

func (r *SQLiteRepository) getTableDDL(table string) (string, error) {
	var createSQL string

	r.db.Table("sqlite_master").
		Select("sql").Where("type = 'table' AND name = ?", table).
		Limit(1).
		Scan(&createSQL)

	if strings.TrimSpace(createSQL) == "" {
		return "", fmt.Errorf("table %s not found in sqlite_master", table)
	}

	return createSQL, nil
}

type View struct {
	Name  string  `gorm:"column:tbl_name"`
	Query *string `gorm:"column:sql"`
}

func (r *SQLiteRepository) views(ctx context.Context, fromCache bool) ([]View, error) {
	views := make([]View, 0)
	cacheKey := r.cacheKey("views")

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &views)
		if err != nil {
			return nil, err
		}

		if len(views) > 0 {
			return views, nil
		}
	}

	err := r.db.WithContext(ctx).Table("sqlite_master").
		Select("tbl_name, sql").
		Where("type = 'view'").
		Order("tbl_name").
		Find(&views).Error

	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, views)

	return views, nil
}

type ForeignKey struct {
	ConstraintName    string
	Columns           []string
	TargetTable       string
	RefColumns        []string
	UpdateAction      string
	DeleteAction      string
	IsDeferrable      bool
	InitiallyDeferred bool
}

func (r *SQLiteRepository) foreignKeys(ctx context.Context, table string, fromCache bool) ([]ForeignKey, error) {
	foreignKeys := make([]ForeignKey, 0)
	cacheKey := r.cacheKey("foreign_keys", table)

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &foreignKeys)
		if err != nil {
			return nil, err
		}

		if len(foreignKeys) > 0 {
			return foreignKeys, nil
		}
	}

	type pragmaFK struct {
		ID       int    `gorm:"column:id"`
		Seq      int    `gorm:"column:seq"`
		Table    string `gorm:"column:table"`
		From     string `gorm:"column:from"`
		To       string `gorm:"column:to"`
		OnUpdate string `gorm:"column:on_update"`
		OnDelete string `gorm:"column:on_delete"`
		Match    string `gorm:"column:match"`
	}

	var fkRows []pragmaFK
	err := r.db.WithContext(ctx).Raw(fmt.Sprintf("PRAGMA foreign_key_list(%s)", quoteIdent(table))).Scan(&fkRows).Error
	if err != nil {
		return nil, err
	}

	fkMap := make(map[int]*ForeignKey)
	for _, row := range fkRows {
		if fk, exists := fkMap[row.ID]; exists {
			fk.Columns = append(fk.Columns, row.From)
			fk.RefColumns = append(fk.RefColumns, row.To)
		} else {
			fkMap[row.ID] = &ForeignKey{
				ConstraintName:    fmt.Sprintf("fk_%s_%s_%d", table, row.Table, row.ID),
				Columns:           []string{row.From},
				TargetTable:       row.Table,
				RefColumns:        []string{row.To},
				UpdateAction:      row.OnUpdate,
				DeleteAction:      row.OnDelete,
				IsDeferrable:      false,
				InitiallyDeferred: false,
			}
		}
	}

	for _, fk := range fkMap {
		foreignKeys = append(foreignKeys, *fk)
	}

	r.updateCache(ctx, cacheKey, foreignKeys)

	return foreignKeys, nil
}
