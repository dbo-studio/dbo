package databaseCore

import (
	"strconv"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (*BaseRepository) ExtractNode(node string) contract.DBNode {
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

	return contract.DBNode{
		Database: database,
		Schema:   schema,
		Table:    table,
	}
}

func (*BaseRepository) ColumnMappedFormat(dataType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(dataType))
	if idx := strings.Index(normalized, "("); idx > -1 {
		normalized = normalized[:idx]
	}

	switch normalized {
	case "VARCHAR", "CHAR", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT", "ENUM", "SET", "JSON", "CHARACTER VARYING", "CHARACTER", "TEXT", "UUID", "VARBIT", "BIT VARYING", "JSONB":
		return "string"
	case "BOOL", "BOOLEAN":
		return "boolean"
	case "INT", "INTEGER", "SMALLINT", "BIGINT", "BIT", "FLOAT", "REAL", "DOUBLE PRECISION", "NUMERIC", "DECIMAL", "SERIAL", "BIGSERIAL", "TINYINT", "MEDIUMINT", "DOUBLE":
		return "number"
	case "BLOB", "TINYBLOB", "MEDIUMBLOB", "LONGBLOB", "BINARY", "VARBINARY":
		return "blob"
	case "DATETIME", "TIMESTAMP", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "YEAR":
		return "datetime"
	case "DATE":
		return "date"
	case "TIME":
		return "time"
	default:
		return "string"
	}
}

func (*BaseRepository) IsCharacterType(dataType string) bool {
	characterTypes := []string{"char", "character", "varchar", "character varying", "text"}
	for _, t := range characterTypes {
		if dataType == t {
			return true
		}
	}
	return false
}

func (*BaseRepository) IsNumericType(dataType string) bool {
	numericTypes := []string{"numeric", "decimal"}
	for _, t := range numericTypes {
		if dataType == t {
			return true
		}
	}
	return false
}

func (*BaseRepository) SanitizeQueryResults(row map[string]any) map[string]any {
	sanitized := make(map[string]any)
	for key, value := range row {
		switch v := value.(type) {
		case float64:
			sanitized[key] = strconv.FormatFloat(v, 'f', -1, 64)
		case []byte:
			sanitized[key] = string(v)
		default:
			sanitized[key] = v
		}
	}

	return sanitized
}
