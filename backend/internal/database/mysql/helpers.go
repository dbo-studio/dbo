package databaseMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type Column struct {
	OrdinalPosition        int32   `gorm:"column:ORDINAL_POSITION"`
	ColumnName             string  `gorm:"column:COLUMN_NAME"`
	DataType               string  `gorm:"column:DATA_TYPE"`
	IsNullable             string  `gorm:"column:IS_NULLABLE"`
	ColumnDefault          *string `gorm:"column:COLUMN_DEFAULT"`
	CharacterMaximumLength *int64  `gorm:"column:CHARACTER_MAXIMUM_LENGTH"`
	Comment                *string `gorm:"column:COLUMN_COMMENT"`
	NumericScale           *int32  `gorm:"column:NUMERIC_SCALE"`

	MappedType   string      `gorm:"-"`
	Editable     bool        `gorm:"-"`
	IsActive     bool        `gorm:"-"`
	IsPrimaryKey bool        `gorm:"-"`
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

		data = append(data, col)
	}

	return data
}

func isCharacterType(dataType string) bool {
	characterTypes := []string{"char", "varchar", "text", "tinytext", "mediumtext", "longtext"}
	normalized := strings.ToLower(dataType)
	for _, t := range characterTypes {
		if normalized == t || strings.HasPrefix(normalized, t+"(") {
			return true
		}
	}
	return false
}

func isNumericType(dataType string) bool {
	numericTypes := []string{"int", "integer", "tinyint", "smallint", "mediumint", "bigint", "float", "double", "decimal", "numeric"}
	normalized := strings.ToLower(dataType)
	for _, t := range numericTypes {
		if normalized == t || strings.HasPrefix(normalized, t+"(") {
			return true
		}
	}
	return false
}

func baseMysqlDataType(dataType string) string {
	normalized := strings.TrimSpace(dataType)
	if idx := strings.Index(normalized, "("); idx != -1 {
		normalized = normalized[:idx]
	}

	return strings.ToUpper(normalized)
}

func formatMysqlColumnType(dataType string, maxLength *string, numericScale *string) string {
	if dataType == "" {
		return dataType
	}

	baseType := baseMysqlDataType(dataType)

	if isCharacterType(dataType) {
		length := "255"
		if maxLength != nil && *maxLength != "" {
			length = *maxLength
		} else if baseType == "CHAR" {
			length = "1"
		}

		return fmt.Sprintf("%s(%s)", baseType, length)
	}

	if isNumericType(dataType) && maxLength != nil && *maxLength != "" {
		if numericScale != nil && *numericScale != "" {
			return fmt.Sprintf("%s(%s,%s)", baseType, *maxLength, *numericScale)
		}

		return fmt.Sprintf("%s(%s)", baseType, *maxLength)
	}

	return baseType
}
