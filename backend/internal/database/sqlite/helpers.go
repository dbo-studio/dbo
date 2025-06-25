package databaseSqlite

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func columnMappedFormat(dataType string) string {
	switch dataType {
	case "INTEGER", "INT":
		return "int"
	case "REAL", "FLOAT", "DOUBLE":
		return "float"
	case "TEXT", "VARCHAR", "CHAR":
		return "string"
	case "BLOB":
		return "blob"
	case "BOOLEAN", "BOOL":
		return "bool"
	case "DATETIME", "TIMESTAMP":
		return "datetime"
	case "DATE":
		return "date"
	case "TIME":
		return "time"
	default:
		return "string"
	}
}

func columnListToResponse(columns []Column) []dto.Column {
	data := make([]dto.Column, 0)
	for _, column := range columns {
		var col dto.Column

		col.Name = column.ColumnName
		col.Type = column.DataType
		col.MappedType = column.MappedType
		col.Editable = column.Editable
		col.IsActive = column.IsActive

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
