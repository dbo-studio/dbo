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
	ColumnType             string  `gorm:"column:COLUMN_TYPE"`
	IsNullable             string  `gorm:"column:IS_NULLABLE"`
	ColumnDefault          *string `gorm:"column:COLUMN_DEFAULT"`
	CharacterMaximumLength *int64  `gorm:"column:CHARACTER_MAXIMUM_LENGTH"`
	Comment                *string `gorm:"column:COLUMN_COMMENT"`
	NumericScale           *int32  `gorm:"column:NUMERIC_SCALE"`

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
		// CHAR/VARCHAR require a length; TEXT family types must not include one.
		if baseType == "CHAR" || baseType == "VARCHAR" {
			length := "255"
			if maxLength != nil && *maxLength != "" {
				length = *maxLength
			} else if baseType == "CHAR" {
				length = "1"
			}

			return fmt.Sprintf("%s(%s)", baseType, length)
		}

		return baseType
	}

	if isNumericType(dataType) && maxLength != nil && *maxLength != "" {
		if numericScale != nil && *numericScale != "" {
			return fmt.Sprintf("%s(%s,%s)", baseType, *maxLength, *numericScale)
		}

		return fmt.Sprintf("%s(%s)", baseType, *maxLength)
	}

	return baseType
}

// formatMysqlDefault ensures DEFAULT literals are valid SQL.
// Values reloaded from INFORMATION_SCHEMA are unquoted (e.g. unknown),
// while form input may already include quotes (e.g. 'unknown').
func formatMysqlDefault(defaultVal string) string {
	trimmed := strings.TrimSpace(defaultVal)
	if trimmed == "" {
		return trimmed
	}

	upper := strings.ToUpper(trimmed)
	if upper == "NULL" ||
		strings.HasPrefix(upper, "CURRENT_TIMESTAMP") ||
		strings.HasPrefix(upper, "CURRENT_DATE") ||
		strings.HasPrefix(upper, "CURRENT_TIME") {
		return trimmed
	}

	if (strings.HasPrefix(trimmed, "'") && strings.HasSuffix(trimmed, "'")) ||
		(strings.HasPrefix(trimmed, "\"") && strings.HasSuffix(trimmed, "\"")) ||
		(strings.HasPrefix(trimmed, "(") && strings.HasSuffix(trimmed, ")")) {
		return trimmed
	}

	if isMysqlNumericLiteral(trimmed) {
		return trimmed
	}

	return "'" + strings.ReplaceAll(trimmed, "'", "''") + "'"
}

func isMysqlNumericLiteral(value string) bool {
	if value == "" {
		return false
	}

	dotSeen := false
	expSeen := false

	for i, r := range value {
		switch {
		case r >= '0' && r <= '9':
			continue
		case (r == '+' || r == '-') && i == 0:
			continue
		case r == '.' && !dotSeen && !expSeen:
			dotSeen = true
		case (r == 'e' || r == 'E') && !expSeen && i > 0:
			expSeen = true
			dotSeen = true
		case (r == '+' || r == '-') && expSeen && i > 0 && (value[i-1] == 'e' || value[i-1] == 'E'):
			continue
		default:
			return false
		}
	}

	return true
}
