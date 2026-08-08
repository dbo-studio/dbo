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

		if column.IsNullable == "0" {
			col.NotNull = false
		} else {
			col.NotNull = true
		}

		if column.ColumnDefault.Valid {
			col.Default = lo.ToPtr(column.ColumnDefault.String)
		}

		data = append(data, col)
	}

	return data
}
