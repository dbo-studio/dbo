package databaseCore

import (
	"encoding/base64"
	"strconv"
	"strings"
	"unicode/utf8"

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

const (
	MappedTypeString   = "string"
	MappedTypeBoolean  = "boolean"
	MappedTypeNumber   = "number"
	MappedTypeDate     = "date"
	MappedTypeTime     = "time"
	MappedTypeDateTime = "datetime"
	MappedTypeEnum     = "enum"
	MappedTypeJSON     = "json"
	MappedTypeUUID     = "uuid"
	MappedTypeBinary   = "binary"
	MappedTypeGeometry = "geometry"
	MappedTypeUnknown  = "unknown"

	binaryBase64MaxBytes = 512 * 1024
)

func (*BaseRepository) ColumnMappedFormat(dataType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(dataType))
	if idx := strings.Index(normalized, "("); idx > -1 {
		normalized = normalized[:idx]
	}
	// Postgres format_type may include schema qualifier: public.my_enum
	if idx := strings.LastIndex(normalized, "."); idx > -1 {
		normalized = normalized[idx+1:]
	}

	switch normalized {
	case "VARCHAR", "CHAR", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT", "CHARACTER VARYING", "CHARACTER", "TEXT", "VARBIT", "BIT VARYING", "NAME", "BPCHAR", "CITEXT", "BIT":
		return MappedTypeString
	case "ENUM":
		return MappedTypeEnum
	case "SET":
		return MappedTypeString
	case "JSON", "JSONB":
		return MappedTypeJSON
	case "UUID":
		return MappedTypeUUID
	case "BOOL", "BOOLEAN":
		return MappedTypeBoolean
	case "INT", "INTEGER", "SMALLINT", "BIGINT", "FLOAT", "REAL", "DOUBLE PRECISION", "NUMERIC", "DECIMAL", "SERIAL", "BIGSERIAL", "TINYINT", "MEDIUMINT", "DOUBLE", "INT2", "INT4", "INT8", "FLOAT4", "FLOAT8", "MONEY", "OID":
		return MappedTypeNumber
	case "BLOB", "TINYBLOB", "MEDIUMBLOB", "LONGBLOB", "BINARY", "VARBINARY", "BYTEA", "BYTE":
		return MappedTypeBinary
	case "DATETIME", "TIMESTAMP", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "TIMESTAMPTZ":
		return MappedTypeDateTime
	case "YEAR":
		return MappedTypeNumber
	case "DATE":
		return MappedTypeDate
	case "TIME", "TIME WITHOUT TIME ZONE", "TIME WITH TIME ZONE", "TIMETZ":
		return MappedTypeTime
	case "INTERVAL":
		return MappedTypeString
	case "GEOMETRY", "GEOGRAPHY", "POINT", "LINESTRING", "POLYGON", "MULTIPOINT", "MULTILINESTRING", "MULTIPOLYGON", "GEOMETRYCOLLECTION", "BOX", "CIRCLE", "PATH", "LSEG":
		return MappedTypeGeometry
	default:
		return MappedTypeUnknown
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
	return SanitizeQueryResultsWithTypes(row, nil)
}

func SanitizeQueryResultsWithTypes(row map[string]any, columnMappedTypes map[string]string) map[string]any {
	sanitized := make(map[string]any, len(row))
	for key, value := range row {
		mappedType := ""
		if columnMappedTypes != nil {
			mappedType = columnMappedTypes[key]
		}

		switch v := value.(type) {
		case float64:
			sanitized[key] = strconv.FormatFloat(v, 'f', -1, 64)
		case []byte:
			sanitized[key] = sanitizeBytes(v, mappedType)
		case string:
			if mappedType == MappedTypeGeometry {
				sanitized[key] = NormalizeGeometryText(v)
			} else {
				sanitized[key] = v
			}
		default:
			sanitized[key] = v
		}
	}

	return sanitized
}

func sanitizeBytes(data []byte, mappedType string) any {
	if mappedType == MappedTypeGeometry {
		if wkt, ok := BytesToWKT(data); ok {
			return wkt
		}

		if utf8.Valid(data) {
			return NormalizeGeometryText(string(data))
		}

		return BinaryCellValue(data)
	}

	forceBinary := mappedType == MappedTypeBinary
	if forceBinary || !utf8.Valid(data) {
		return BinaryCellValue(data)
	}

	return string(data)
}

func BinaryCellValue(data []byte) map[string]any {
	out := map[string]any{
		"__dbo":  MappedTypeBinary,
		"length": len(data),
	}
	if len(data) <= binaryBase64MaxBytes {
		out["base64"] = base64.StdEncoding.EncodeToString(data)
	}

	return out
}

func ParseMysqlEnumOrSetValues(columnType string) []string {
	normalized := strings.TrimSpace(columnType)

	lower := strings.ToLower(normalized)
	if !strings.HasPrefix(lower, "enum(") && !strings.HasPrefix(lower, "set(") {
		return nil
	}

	start := strings.Index(normalized, "(")

	end := strings.LastIndex(normalized, ")")
	if start < 0 || end <= start {
		return nil
	}

	inner := normalized[start+1 : end]
	values := make([]string, 0)

	var current strings.Builder

	inQuote := false

	for i := 0; i < len(inner); i++ {
		ch := inner[i]
		if ch == '\'' {
			if inQuote && i+1 < len(inner) && inner[i+1] == '\'' {
				current.WriteByte('\'')

				i++

				continue
			}

			inQuote = !inQuote

			continue
		}

		if ch == ',' && !inQuote {
			values = append(values, current.String())
			current.Reset()

			continue
		}

		if inQuote {
			current.WriteByte(ch)
		}
	}

	if inQuote || current.Len() > 0 || len(values) > 0 {
		if current.Len() > 0 || (len(inner) > 0 && strings.Contains(inner, "'")) {
			values = append(values, current.String())
		}
	}

	if len(values) == 0 {
		return nil
	}

	return values
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
