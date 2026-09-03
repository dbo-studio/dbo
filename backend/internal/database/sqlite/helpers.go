package databaseSqlite

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func columnListToResponse(columns []Column) []dto.Column {
	data := make([]dto.Column, 0)

	for _, column := range columns {
		var col dto.Column

		col.Name = column.ColumnName
		col.Type = column.DataType
		col.MappedType = column.MappedType
		col.Editable = column.Editable
		col.IsActive = column.IsActive
		col.IsPrimaryKey = column.IsPrimaryKey == "1"
		col.IsForeignKey = column.IsForeignKey

		// After getColumns, IsNullable uses is_nullable semantics: "0" = NOT NULL.
		col.NotNull = column.IsNullable == "0"

		if column.ColumnDefault.Valid {
			col.Default = lo.ToPtr(column.ColumnDefault.String)
		}

		if column.ForeignKey != nil {
			if column.ForeignKey.TargetTable != "" {
				col.ReferencedTable = lo.ToPtr(column.ForeignKey.TargetTable)
			}

			col.ReferencedColumns = append([]string(nil), column.ForeignKey.RefColumns...)
			col.LocalColumns = append([]string(nil), column.ForeignKey.Columns...)
		}

		data = append(data, col)
	}

	return data
}
