package databaseCore

import (
	"strconv"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *BaseRepository) ExtractNode(node string) databaseContract.DBNode {
	switch r.Connection().ConnectionType {
	case string(databaseContract.Mysql):
		return r.mysqlNode(node)
	case string(databaseContract.Postgresql):
		return r.postgresqlNode(node)
	case string(databaseContract.Sqlite):
		return r.sqliteNode(node)
	default:
		return databaseContract.DBNode{}
	}
}

// FormatNodeID builds a canonical tree node id for the given connection type.
// Container suffixes (tableContainer, etc.) are never emitted as object names.
func FormatNodeID(connectionType string, node databaseContract.DBNode) string {
	switch connectionType {
	case string(databaseContract.Mysql):
		return formatMysqlNodeID(node)
	case string(databaseContract.Postgresql):
		return formatPostgresqlNodeID(node)
	case string(databaseContract.Sqlite):
		return formatSqliteNodeID(node)
	default:
		return ""
	}
}

func isContainerSegment(segment string) bool {
	switch databaseContract.TreeNodeType(segment) {
	case databaseContract.TableContainerNodeType,
		databaseContract.ViewContainerNodeType,
		databaseContract.MaterializedViewContainerNodeType:
		return true
	default:
		return false
	}
}

func formatMysqlNodeID(node databaseContract.DBNode) string {
	parts := make([]string, 0, 2)
	if node.Database != "" {
		parts = append(parts, node.Database)
	}
	if node.Table != "" && !isContainerSegment(node.Table) {
		parts = append(parts, node.Table)
	}
	return strings.Join(parts, ".")
}

func formatPostgresqlNodeID(node databaseContract.DBNode) string {
	parts := make([]string, 0, 3)
	if node.Database != "" {
		parts = append(parts, node.Database)
	}
	if node.Schema != "" && !isContainerSegment(node.Schema) {
		parts = append(parts, node.Schema)
	}
	if node.Table != "" && !isContainerSegment(node.Table) {
		parts = append(parts, node.Table)
	}
	return strings.Join(parts, ".")
}

func formatSqliteNodeID(node databaseContract.DBNode) string {
	if node.Table == "" || isContainerSegment(node.Table) {
		return ""
	}
	return node.Table
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

func (*BaseRepository) postgresqlNode(nodeID string) databaseContract.DBNode {
	parts := strings.Split(nodeID, ".")

	var database, schema, table string

	switch len(parts) {
	case 1:
		database = parts[0]
	case 2:
		database, schema = parts[0], parts[1]
	case 3:
		database, schema, table = parts[0], parts[1], parts[2]
	}

	return databaseContract.DBNode{
		Database: database,
		Schema:   schema,
		Table:    table,
	}
}

func (*BaseRepository) mysqlNode(nodeID string) databaseContract.DBNode {
	parts := strings.Split(nodeID, ".")

	var database, table string

	switch len(parts) {
	case 1:
		database = parts[0]
	case 2:
		database, table = parts[0], parts[1]
	}

	return databaseContract.DBNode{
		Database: database,
		Table:    table,
	}
}

func (*BaseRepository) sqliteNode(nodeID string) databaseContract.DBNode {
	return databaseContract.DBNode{
		Table: nodeID,
	}
}
