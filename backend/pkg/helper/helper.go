package helper

import (
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

func StructToJson(value interface{}) string {
	j, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(j)
}

func RawJsonToStruct[T any](value json.RawMessage) (T, error) {
	var v T
	if value == nil {
		return v, nil
	}

	err := json.Unmarshal(value, &v)
	return v, err
}

func FormatSQLValue(value interface{}) string {
	switch v := value.(type) {
	case string:
		if isAlreadyQuoted(v) {
			return v
		}
		// If not quoted, escape single quotes and add quotes
		escaped := strings.ReplaceAll(v, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v)
	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v)
	case float32, float64:
		// Use strconv to avoid scientific notation
		return strconv.FormatFloat(reflect.ValueOf(v).Float(), 'f', -1, 64)
	case bool:
		return fmt.Sprintf("%t", v)
	default:
		// For other types, use %v but convert to string first to avoid scientific notation
		return fmt.Sprintf("'%s'", fmt.Sprintf("%v", v))
	}
}

func isAlreadyQuoted(s string) bool {
	if len(s) < 2 {
		return false
	}
	return s[0] == '\'' && s[len(s)-1] == '\''
}

func SanitizeQueryResults(row map[string]any) map[string]any {
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
