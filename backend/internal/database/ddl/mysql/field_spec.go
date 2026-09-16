package ddlMysql

import (
	"fmt"
	"strings"
)

// FormatColumnType renders a MySQL column type with length/scale where the
// type family supports them.
func FormatColumnType(dataType string, maxLength *string, numericScale *string) string {
	if dataType == "" {
		return dataType
	}

	baseType := baseDataType(dataType)

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

// FormatDefault ensures DEFAULT literals are valid SQL.
// Values reloaded from INFORMATION_SCHEMA are unquoted (e.g. unknown),
// while form input may already include quotes (e.g. 'unknown').
func FormatDefault(defaultVal string) string {
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

	if isNumericLiteral(trimmed) {
		return trimmed
	}

	return "'" + strings.ReplaceAll(trimmed, "'", "''") + "'"
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

func baseDataType(dataType string) string {
	normalized := strings.TrimSpace(dataType)
	if idx := strings.Index(normalized, "("); idx != -1 {
		normalized = normalized[:idx]
	}

	return strings.ToUpper(normalized)
}

func isNumericLiteral(value string) bool {
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
