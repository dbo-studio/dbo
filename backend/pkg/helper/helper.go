package helper

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goccy/go-json"
)

func IsLocal() bool {
	return os.Getenv("APP_ENV") == "local"
}

func FloatToString(str float64) string {
	return strconv.FormatFloat(str, 'f', -1, 64)
}

func IntToStringPtr[T int32 | int64](value *T) *string {
	if value == nil {
		return nil
	}

	str := strconv.FormatInt(int64(*value), 10)

	return &str
}

func StructToJSON(value any) string {
	j, err := json.Marshal(value)
	if err != nil {
		return ""
	}

	return string(j)
}

func RawJSONToStruct[T any](value json.RawMessage) (T, error) {
	var v T
	if value == nil {
		return v, nil
	}

	err := json.Unmarshal(value, &v)

	return v, err
}

func FormatSQLValue(value any) string {
	s, err := FormatSQLValueForDriver("mysql", value)
	if err != nil {
		escaped := strings.ReplaceAll(fmt.Sprintf("%v", value), "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	}

	return s
}

func FormatSQLValueForDriver(driver string, value any) (string, error) {
	// Nullable columns arrive as pointers (ClickHouse): format what they point at.
	if rv := reflect.ValueOf(value); rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return "NULL", nil
		}

		return FormatSQLValueForDriver(driver, rv.Elem().Interface())
	}

	switch v := value.(type) {
	case nil:
		return "NULL", nil
	case string:
		escaped := strings.ReplaceAll(v, "'", "''")

		// T-SQL reads a plain literal in the database code page, which turns characters outside it into '?'.
		if NormalizeSQLDriver(driver) == "sqlserver" {
			return fmt.Sprintf("N'%s'", escaped), nil
		}

		return fmt.Sprintf("'%s'", escaped), nil
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v), nil
	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v), nil
	case float32, float64:
		return strconv.FormatFloat(reflect.ValueOf(v).Float(), 'f', -1, 64), nil
	case time.Time:
		// A plain literal cannot carry the offset ClickHouse needs; the function reads it and casts to the column type.
		if NormalizeSQLDriver(driver) == "clickhouse" {
			return "parseDateTime64BestEffort('" + v.Format("2006-01-02 15:04:05.999999999-07:00") + "', 9)", nil
		}

		// MySQL datetimes carry no zone; the others keep the offset.
		if NormalizeSQLDriver(driver) == "mysql" {
			return "'" + v.Format("2006-01-02 15:04:05.999999") + "'", nil
		}

		return "'" + v.Format("2006-01-02 15:04:05.999999999-07:00") + "'", nil
	case bool:
		// MySQL/SQLite store booleans as 0/1; Postgres accepts true/false literals.
		switch NormalizeSQLDriver(driver) {
		case "mysql", "sqlite", "sqlite3", "sqlserver":
			if v {
				return "1", nil
			}

			return "0", nil
		default:
			return fmt.Sprintf("%t", v), nil
		}
	case map[string]any:
		if isBinaryCellMap(v) {
			return formatBinarySQL(driver, v)
		}

		if NormalizeSQLDriver(driver) == "clickhouse" {
			if literal, ok := clickhouseCollectionLiteral(driver, v); ok {
				return literal, nil
			}
		}

		escaped := strings.ReplaceAll(fmt.Sprintf("%v", v), "'", "''")

		return fmt.Sprintf("'%s'", escaped), nil
	default:
		if NormalizeSQLDriver(driver) == "clickhouse" {
			if literal, ok := clickhouseCollectionLiteral(driver, v); ok {
				return literal, nil
			}
		}

		escaped := strings.ReplaceAll(fmt.Sprintf("%v", v), "'", "''")

		return fmt.Sprintf("'%s'", escaped), nil
	}
}

// clickhouseCollectionLiteral writes Array and Map values as ClickHouse literals; printing them with %v
// would store the Go text "map[k:v]" instead of the value.
func clickhouseCollectionLiteral(driver string, v any) (string, bool) {
	rv := reflect.ValueOf(v)

	switch rv.Kind() {
	case reflect.Slice, reflect.Array:
		if rv.Type().Elem().Kind() == reflect.Uint8 {
			return "", false
		}

		parts := make([]string, rv.Len())

		for i := range parts {
			part, err := FormatSQLValueForDriver(driver, rv.Index(i).Interface())
			if err != nil {
				return "", false
			}

			parts[i] = part
		}

		return "[" + strings.Join(parts, ", ") + "]", true
	case reflect.Map:
		keys := rv.MapKeys()
		sort.Slice(keys, func(i, j int) bool { return fmt.Sprint(keys[i].Interface()) < fmt.Sprint(keys[j].Interface()) })

		parts := make([]string, 0, len(keys)*2)

		for _, key := range keys {
			k, err1 := FormatSQLValueForDriver(driver, key.Interface())
			val, err2 := FormatSQLValueForDriver(driver, rv.MapIndex(key).Interface())

			if err1 != nil || err2 != nil {
				return "", false
			}

			parts = append(parts, k, val)
		}

		return "map(" + strings.Join(parts, ", ") + ")", true
	default:
		return "", false
	}
}

func isBinaryCellMap(m map[string]any) bool {
	dbo, ok := m["__dbo"].(string)
	return ok && dbo == "binary"
}

func binaryLength(m map[string]any) int {
	switch n := m["length"].(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return -1
	}
}

func formatBinarySQL(driver string, m map[string]any) (string, error) {
	length := binaryLength(m)
	base64Str, hasBase64 := m["base64"].(string)

	if !hasBase64 || base64Str == "" {
		if length == 0 {
			return emptyBinaryLiteral(driver), nil
		}

		return "", fmt.Errorf("binary payload missing base64 (length=%d)", length)
	}

	raw, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return "", fmt.Errorf("invalid binary base64: %w", err)
	}

	hexStr := hex.EncodeToString(raw)

	switch NormalizeSQLDriver(driver) {
	case "postgresql":
		return fmt.Sprintf(`'\x%s'::bytea`, hexStr), nil
	case "sqlserver":
		return "0x" + strings.ToUpper(hexStr), nil
	default:
		return fmt.Sprintf("X'%s'", strings.ToUpper(hexStr)), nil
	}
}

func emptyBinaryLiteral(driver string) string {
	switch NormalizeSQLDriver(driver) {
	case "postgresql":
		return `'\x'::bytea`
	case "sqlserver":
		return "0x"
	default:
		return "X''"
	}
}

func NormalizeSQLDriver(driver string) string {
	d := strings.ToLower(strings.TrimSpace(driver))
	switch d {
	case "postgres", "postgresql", "pg":
		return "postgresql"
	case "mysql", "mariadb":
		return "mysql"
	case "sqlite", "sqlite3":
		return "sqlite"
	default:
		return d
	}
}

func ConvertToDTO[T any](params []byte) (T, error) {
	var dtoParams T

	err := json.Unmarshal(params, &dtoParams)
	if err != nil {
		return dtoParams, fmt.Errorf("failed to unmarshal params: %w", err)
	}

	return dtoParams, nil
}
