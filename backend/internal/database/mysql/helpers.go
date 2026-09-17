package databaseMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

type Column struct {
	OrdinalPosition        int32   `gorm:"column:ORDINAL_POSITION"`
	ColumnName             string  `gorm:"column:COLUMN_NAME"`
	DataType               string  `gorm:"column:DATA_TYPE"`
	ColumnType             string  `gorm:"column:COLUMN_TYPE"`
	IsNullable             string  `gorm:"column:IS_NULLABLE"`
	ColumnDefault          *string `gorm:"column:COLUMN_DEFAULT"`
	CharacterMaximumLength *int64  `gorm:"column:CHARACTER_MAXIMUM_LENGTH"`
	Comment                *string `gorm:"column:COLUMN_COMMENT"`
	NumericScale           *int32  `gorm:"column:NUMERIC_SCALE"`
	Extra                  string  `gorm:"column:EXTRA"`

	MappedType   string      `gorm:"-"`
	Editable     bool        `gorm:"-"`
	IsActive     bool        `gorm:"-"`
	IsPrimaryKey bool        `gorm:"-"`
	IsForeignKey bool        `gorm:"-"`
	EnumValues   []string    `gorm:"-"`
	ForeignKey   *ForeignKey `gorm:"-"`
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
		col.Length = column.CharacterMaximumLength
		col.Default = column.ColumnDefault
		col.Comment = column.Comment
		col.NotNull = column.IsNullable == "NO"
		col.IsPrimaryKey = column.IsPrimaryKey
		col.IsForeignKey = column.IsForeignKey
		col.EnumValues = column.EnumValues

		if column.ForeignKey != nil {
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

func isMysqlBooleanColumn(dataType, columnType string) bool {
	normalizedType := strings.ToLower(strings.TrimSpace(columnType))
	if strings.Contains(normalizedType, "tinyint(1)") {
		return true
	}

	return strings.EqualFold(strings.TrimSpace(dataType), "bool") ||
		strings.EqualFold(strings.TrimSpace(dataType), "boolean")
}
