package databasePostgres

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type PGNode struct {
	Database string
	Schema   string
	Table    string
}

func extractNode(node string) PGNode {
	parts := strings.Split(node, ".")

	var database, schema, table string

	switch len(parts) {
	case 1:
		database = parts[0]
	case 2:
		database, schema = parts[0], parts[1]
	case 3:
		database, schema, table = parts[0], parts[1], parts[2]
	}

	return PGNode{
		Database: database,
		Schema:   schema,
		Table:    table,
	}
}

func columnMappedFormat(dataType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(dataType))
	if idx := strings.Index(normalized, "("); idx > -1 {
		normalized = normalized[:idx]
	}

	switch normalized {
	case "VARCHAR", "CHARACTER VARYING", "CHARACTER", "TEXT", "UUID", "TIMESTAMP", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "VARBIT", "BIT VARYING", "JSON", "JSONB":
		return "string"
	case "BOOL", "BOOLEAN":
		return "boolean"
	case "INT", "INTEGER", "SMALLINT", "BIGINT", "BIT", "FLOAT", "REAL", "DOUBLE PRECISION", "NUMERIC", "DECIMAL", "SERIAL", "BIGSERIAL":
		return "number"
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
		col.Length = column.CharacterMaximumLength
		col.Default = column.ColumnDefault
		col.Comment = column.Comment
		col.NotNull = column.IsNullable == "NO"

		data = append(data, col)
	}

	return data
}

func isCharacterType(dataType string) bool {
	characterTypes := []string{"char", "character", "varchar", "character varying", "text"}
	for _, t := range characterTypes {
		if dataType == t {
			return true
		}
	}
	return false
}

func isNumericType(dataType string) bool {
	numericTypes := []string{"numeric", "decimal"}
	for _, t := range numericTypes {
		if dataType == t {
			return true
		}
	}
	return false
}
