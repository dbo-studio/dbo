package databaseCore

import (
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"unicode/utf8"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *BaseRepository) ExtractNode(node string) databaseContract.DBNode {
	switch {
	case databaseContract.IsMysqlFamily(r.Connection().ConnectionType), databaseContract.IsHostSQL(r.Connection().ConnectionType):
		return r.mysqlNode(node)
	case databaseContract.IsPostgresFamily(r.Connection().ConnectionType):
		return r.postgresqlNode(node)
	case r.Connection().ConnectionType == string(databaseContract.Sqlite):
		return r.sqliteNode(node)
	default:
		return databaseContract.DBNode{}
	}
}

// FormatNodeID builds a canonical tree node id for the given connection type.
// Container suffixes (tableContainer, etc.) are never emitted as object names.
func FormatNodeID(connectionType string, node databaseContract.DBNode) string {
	switch {
	case databaseContract.IsMysqlFamily(connectionType), databaseContract.IsHostSQL(connectionType):
		return formatMysqlNodeID(node)
	case databaseContract.IsPostgresFamily(connectionType):
		return formatPostgresqlNodeID(node)
	case connectionType == string(databaseContract.Sqlite):
		return formatSqliteNodeID(node)
	default:
		return ""
	}
}

func isContainerSegment(segment string) bool {
	switch databaseContract.TreeNodeType(segment) {
	case databaseContract.TableContainerNodeType,
		databaseContract.ViewContainerNodeType,
		databaseContract.MaterializedViewContainerNodeType,
		databaseContract.TypeContainerNodeType,
		databaseContract.SequenceContainerNodeType,
		databaseContract.FunctionContainerNodeType,
		databaseContract.ProcedureContainerNodeType,
		databaseContract.EventContainerNodeType:
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
	normalized := strings.ToUpper(strings.TrimSpace(unwrapNullable(dataType)))
	if idx := strings.Index(normalized, "("); idx > -1 {
		normalized = normalized[:idx]
	}
	// Postgres format_type may include schema qualifier: public.my_enum
	if idx := strings.LastIndex(normalized, "."); idx > -1 {
		normalized = normalized[idx+1:]
	}

	switch normalized {
	case "VARCHAR", "CHAR", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT", "CHARACTER VARYING", "CHARACTER", "TEXT", "NVARCHAR", "NCHAR", "NTEXT", "SYSNAME", "XML", "STRING", "FIXEDSTRING", "VARBIT", "BIT VARYING", "NAME", "BPCHAR", "CITEXT", "BIT":
		return MappedTypeString
	case "ENUM", "ENUM8", "ENUM16":
		return MappedTypeEnum
	case "SET":
		return MappedTypeString
	case "JSON", "JSONB", "ARRAY", "MAP", "TUPLE", "NESTED":
		return MappedTypeJSON
	case "UUID", "UNIQUEIDENTIFIER":
		return MappedTypeUUID
	case "BOOL", "BOOLEAN":
		return MappedTypeBoolean
	case "INT", "INTEGER", "SMALLINT", "BIGINT", "FLOAT", "REAL", "DOUBLE PRECISION", "NUMERIC", "DECIMAL", "SERIAL", "BIGSERIAL", "TINYINT", "MEDIUMINT", "DOUBLE", "INT2", "INT4", "INT8", "FLOAT4", "FLOAT8", "MONEY", "SMALLMONEY", "OID", "INT16", "INT32", "INT64", "INT128", "INT256", "UINT8", "UINT16", "UINT32", "UINT64", "UINT128", "UINT256", "FLOAT32", "FLOAT64", "DECIMAL32", "DECIMAL64", "DECIMAL128", "DECIMAL256":
		return MappedTypeNumber
	case "BLOB", "IMAGE", "TINYBLOB", "MEDIUMBLOB", "LONGBLOB", "BINARY", "VARBINARY", "BYTEA", "BYTE":
		return MappedTypeBinary
	case "DATETIME", "TIMESTAMP", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "TIMESTAMPTZ", "DATETIME2", "SMALLDATETIME", "DATETIMEOFFSET", "DATETIME64":
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

// unwrapNullable drops ClickHouse Nullable(...) / LowCardinality(...) wrappers so the inner type is mapped.
func unwrapNullable(t string) string {
	t = strings.TrimSpace(t)

	for {
		switch {
		case strings.HasPrefix(t, "Nullable(") && strings.HasSuffix(t, ")"):
			t = t[len("Nullable(") : len(t)-1]
		case strings.HasPrefix(t, "LowCardinality(") && strings.HasSuffix(t, ")"):
			t = t[len("LowCardinality(") : len(t)-1]
		default:
			return t
		}
	}
}

func IsCharacterType(dataType string) bool {
	characterTypes := []string{"char", "character", "varchar", "character varying", "text"}

	normalized := strings.ToLower(strings.TrimSpace(dataType))
	for _, t := range characterTypes {
		if normalized == t {
			return true
		}
	}

	return false
}

func (BaseRepository) IsCharacterType(dataType string) bool {
	return IsCharacterType(dataType)
}

func IsNumericType(dataType string) bool {
	numericTypes := []string{"numeric", "decimal"}

	normalized := strings.ToLower(strings.TrimSpace(dataType))
	for _, t := range numericTypes {
		if normalized == t {
			return true
		}
	}

	return false
}

func (BaseRepository) IsNumericType(dataType string) bool {
	return IsNumericType(dataType)
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

	if mappedType == MappedTypeUUID && len(data) == 16 {
		return guidString(data)
	}

	forceBinary := mappedType == MappedTypeBinary
	if forceBinary || !utf8.Valid(data) {
		return BinaryCellValue(data)
	}

	return string(data)
}

// guidString formats the 16 bytes SQL Server sends for uniqueidentifier: the first three groups are little-endian.
func guidString(b []byte) string {
	return fmt.Sprintf("%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
		b[3], b[2], b[1], b[0], b[5], b[4], b[7], b[6], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15])
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
