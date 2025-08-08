package databasePostgres

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
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
	switch dataType {
	case "VARCHAR", "TEXT", "UUID", "TIMESTAMP", "VARBIT":
		return "string"
	case "BOOL":
		return "boolean"
	case "INT", "INTEGER", "BIT", "FLOAT":
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

		if column.IsNullable == "NO" {
			col.NotNull = false
		} else {
			col.NotNull = true
		}

		if column.CharacterMaximumLength.Valid {
			col.Length = lo.ToPtr(column.CharacterMaximumLength.Int32)
		}

		if column.ColumnDefault.Valid {
			col.Default = lo.ToPtr(column.ColumnDefault.String)
		}

		if column.Comment.Valid {
			col.Comment = lo.ToPtr(column.Comment.String)
		}

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
