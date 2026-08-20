package databasePostgres

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
		col.Length = column.CharacterMaximumLength
		col.Default = column.ColumnDefault
		col.Comment = column.Comment
		col.NotNull = column.IsNullable == "NO"
		col.IsPrimaryKey = column.IsPrimaryKey
		col.IsForeignKey = column.IsForeignKey
		col.EnumValues = column.EnumValues

		if column.ForeignKey != nil {
			if column.ForeignKey.TargetSchema != "" {
				col.ReferencedSchema = lo.ToPtr(column.ForeignKey.TargetSchema)
			}

			if column.ForeignKey.TargetTable != "" {
				col.ReferencedTable = lo.ToPtr(column.ForeignKey.TargetTable)
			}

			col.ReferencedColumns = append([]string(nil), column.ForeignKey.RefColumnsList...)
			col.LocalColumns = append([]string(nil), column.ForeignKey.ColumnsList...)
		}

		data = append(data, col)
	}

	return data
}
