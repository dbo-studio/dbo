package helper

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"reflect"
	"strconv"
	"strings"

	"github.com/goccy/go-json"
)

func IsLocal() bool {
	return os.Getenv("APP_ENV") == "local"
}

func FloatToString(str float64) string {
	return strconv.FormatFloat(str, 'f', -1, 64)
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
	switch v := value.(type) {
	case nil:
		return "NULL", nil
	case string:
		if isAlreadyQuoted(v) {
			return v, nil
		}

		escaped := strings.ReplaceAll(v, "'", "''")

		return fmt.Sprintf("'%s'", escaped), nil
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v), nil
	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v), nil
	case float32, float64:
		return strconv.FormatFloat(reflect.ValueOf(v).Float(), 'f', -1, 64), nil
	case bool:
		// MySQL/SQLite store booleans as 0/1; Postgres accepts true/false literals.
		switch NormalizeSQLDriver(driver) {
		case "mysql", "sqlite", "sqlite3":
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

		escaped := strings.ReplaceAll(fmt.Sprintf("%v", v), "'", "''")

		return fmt.Sprintf("'%s'", escaped), nil
	default:
		escaped := strings.ReplaceAll(fmt.Sprintf("%v", v), "'", "''")
		return fmt.Sprintf("'%s'", escaped), nil
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
	default:
		return fmt.Sprintf("X'%s'", strings.ToUpper(hexStr)), nil
	}
}

func emptyBinaryLiteral(driver string) string {
	switch NormalizeSQLDriver(driver) {
	case "postgresql":
		return `'\x'::bytea`
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

func isAlreadyQuoted(s string) bool {
	if len(s) < 2 {
		return false
	}

	return s[0] == '\'' && s[len(s)-1] == '\''
}

func ConvertToDTO[T any](params []byte) (T, error) {
	var dtoParams T

	err := json.Unmarshal(params, &dtoParams)
	if err != nil {
		return dtoParams, fmt.Errorf("failed to unmarshal params: %w", err)
	}

	return dtoParams, nil
}
