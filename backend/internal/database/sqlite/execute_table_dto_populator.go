package databaseSqlite

import (
	"context"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) populateTableParamsFromDDL(tableParams *dto.SQLiteTableParams) string {
	if tableParams == nil || tableParams.Old == nil || tableParams.Old.Name == nil {
		return ""
	}

	tableName := *tableParams.Old.Name
	tableDDL, err := r.getTableDDL(tableName)
	if err != nil {
		r.setDefaultTableParams(tableParams)
		return ""
	}

	ddlUpper := strings.ToUpper(strings.TrimSpace(tableDDL))
	r.populateTableParamsFromDDLString(tableParams, ddlUpper)
	return tableDDL
}

func (r *SQLiteRepository) setDefaultTableParams(tableParams *dto.SQLiteTableParams) {
	if tableParams.New == nil {
		tableParams.New = &dto.SQLiteTableParamsData{
			Name:         tableParams.Old.Name,
			Temporary:    lo.ToPtr(false),
			Strict:       lo.ToPtr(false),
			WithoutRowid: lo.ToPtr(false),
		}
		return
	}

	if tableParams.New.Name == nil {
		tableParams.New.Name = tableParams.Old.Name
	}
	if tableParams.New.Temporary == nil {
		tableParams.New.Temporary = lo.ToPtr(false)
	}
	if tableParams.New.Strict == nil {
		tableParams.New.Strict = lo.ToPtr(false)
	}
	if tableParams.New.WithoutRowid == nil {
		tableParams.New.WithoutRowid = lo.ToPtr(false)
	}
}

func (r *SQLiteRepository) populateTableParamsFromDDLString(tableParams *dto.SQLiteTableParams, ddlUpper string) {
	if tableParams.New == nil {
		tableParams.New = &dto.SQLiteTableParamsData{}
	}

	if tableParams.New.Name == nil {
		tableParams.New.Name = tableParams.Old.Name
	}

	if tableParams.New.Temporary == nil {
		temporary := strings.Contains(ddlUpper, "CREATE TEMPORARY TABLE")
		tableParams.New.Temporary = &temporary
	}

	if tableParams.New.Strict == nil {
		strict := strings.Contains(ddlUpper, " STRICT")
		tableParams.New.Strict = &strict
	}

	if tableParams.New.WithoutRowid == nil {
		withoutRowid := strings.Contains(ddlUpper, " WITHOUT ROWID")
		tableParams.New.WithoutRowid = &withoutRowid
	}

	if tableParams.Old.Temporary == nil {
		temporary := strings.Contains(ddlUpper, "CREATE TEMPORARY TABLE")
		tableParams.Old.Temporary = &temporary
	}

	if tableParams.Old.Strict == nil {
		strict := strings.Contains(ddlUpper, " STRICT")
		tableParams.Old.Strict = &strict
	}

	if tableParams.Old.WithoutRowid == nil {
		withoutRowid := strings.Contains(ddlUpper, " WITHOUT ROWID")
		tableParams.Old.WithoutRowid = &withoutRowid
	}
}

func (r *SQLiteRepository) populateColumnParamsFromDDL(columnParams *dto.SQLiteTableColumnParams, tableDDL string) {
	if columnParams == nil || len(columnParams.Columns) > 0 || tableDDL == "" {
		return
	}

	tableName := r.extractTableNameFromDDL(tableDDL)
	if tableName == "" {
		return
	}

	columns, err := r.getColumns(tableName, []string{}, false)
	if err != nil {
		return
	}

	columnParams.Columns = r.convertColumnsToDTO(columns)
}

func (r *SQLiteRepository) extractTableNameFromDDL(tableDDL string) string {
	ddlUpper := strings.ToUpper(strings.TrimSpace(tableDDL))
	openParen := strings.Index(ddlUpper, "(")
	if openParen <= 0 {
		return ""
	}

	tablePart := strings.TrimSpace(ddlUpper[:openParen])
	tablePart = strings.TrimPrefix(tablePart, "CREATE TEMPORARY TABLE")
	tablePart = strings.TrimPrefix(tablePart, "CREATE TABLE")
	tablePart = strings.TrimSpace(tablePart)

	return strings.Trim(tablePart, "\"")
}

func (r *SQLiteRepository) convertColumnsToDTO(columns []Column) []dto.SQLiteTableColumn {
	result := make([]dto.SQLiteTableColumn, len(columns))
	for i, col := range columns {
		notNull := col.IsNullable == "0"
		defaultVal := ""
		if col.ColumnDefault.Valid {
			defaultVal = col.ColumnDefault.String
		}

		colData := &dto.SQLiteTableColumnData{
			Name:     lo.ToPtr(col.ColumnName),
			DataType: lo.ToPtr(col.DataType),
			NotNull:  &notNull,
			Default:  lo.ToPtr(defaultVal),
		}

		result[i] = dto.SQLiteTableColumn{
			New:     colData,
			Old:     colData,
			Added:   lo.ToPtr(false),
			Deleted: lo.ToPtr(false),
		}
	}
	return result
}

func (r *SQLiteRepository) populateForeignKeyParamsFromDB(foreignKeyParams *dto.SQLiteTableForeignKeyParams, tableName string) {
	if foreignKeyParams == nil || len(foreignKeyParams.Columns) > 0 {
		return
	}

	ctx := context.Background()
	fks, err := r.foreignKeys(ctx, tableName, false)
	if err != nil || len(fks) == 0 {
		return
	}

	foreignKeyParams.Columns = r.convertForeignKeysToDTO(fks)
}

func (r *SQLiteRepository) convertForeignKeysToDTO(fks []ForeignKey) []dto.SQLiteTableForeignKey {
	result := make([]dto.SQLiteTableForeignKey, len(fks))
	for i, fk := range fks {
		fkData := &dto.SQLiteTableForeignKeyData{
			ConstraintName:    lo.ToPtr(fk.ConstraintName),
			SourceColumns:     fk.Columns,
			TargetTable:       lo.ToPtr(fk.TargetTable),
			TargetColumns:     fk.RefColumns,
			OnUpdate:          lo.ToPtr(fk.UpdateAction),
			OnDelete:          lo.ToPtr(fk.DeleteAction),
			IsDeferrable:      &fk.IsDeferrable,
			InitiallyDeferred: &fk.InitiallyDeferred,
		}

		result[i] = dto.SQLiteTableForeignKey{
			New:     fkData,
			Old:     fkData,
			Added:   lo.ToPtr(false),
			Deleted: lo.ToPtr(false),
		}
	}
	return result
}

func (r *SQLiteRepository) populateKeyParamsFromDB(keyParams *dto.SQLiteTableKeyParams, tableName string) {
	if keyParams == nil || len(keyParams.Keys) > 0 {
		return
	}

	pkColumns, err := r.getPrimaryKeys(Table{Name: tableName})
	if err != nil || len(pkColumns) == 0 {
		return
	}

	keyParams.Keys = []dto.SQLiteTableKey{
		{
			New: &dto.SQLiteTableKeyData{
				Name:    lo.ToPtr("PRIMARY"),
				Columns: pkColumns,
				Type:    lo.ToPtr("PRIMARY KEY"),
			},
			Old: &dto.SQLiteTableKeyData{
				Name:    lo.ToPtr("PRIMARY"),
				Columns: pkColumns,
				Type:    lo.ToPtr("PRIMARY KEY"),
			},
			Added:   lo.ToPtr(false),
			Deleted: lo.ToPtr(false),
		},
	}
}
