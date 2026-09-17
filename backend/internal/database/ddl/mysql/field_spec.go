package ddlMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func formatColumnType(dataType string, maxLength *string, numericScale *string) string {
	if dataType == "" {
		return dataType
	}

	baseType := baseDataType(dataType)

	if isMysqlCharacterType(dataType) {
		// CHAR/VARCHAR require a length; TEXT family types must not include one.
		if baseType == "CHAR" || baseType == "VARCHAR" {
			length := "255"
			if maxLength != nil && ddl.DigitsOnly(*maxLength) {
				length = *maxLength
			} else if baseType == "CHAR" {
				length = "1"
			}

			return fmt.Sprintf("%s(%s)", baseType, length)
		}

		return baseType
	}

	if isMysqlNumericType(dataType) && maxLength != nil && ddl.DigitsOnly(*maxLength) {
		if numericScale != nil && ddl.DigitsOnly(*numericScale) {
			return fmt.Sprintf("%s(%s,%s)", baseType, *maxLength, *numericScale)
		}

		return fmt.Sprintf("%s(%s)", baseType, *maxLength)
	}

	return baseType
}

func formatDefault(defaultVal string) string {
	trimmed := strings.TrimSpace(defaultVal)
	if trimmed == "" {
		return trimmed
	}

	upper := strings.ToUpper(trimmed)
	if upper == "NULL" || isCurrentDateTimeKeyword(upper) {
		return trimmed
	}

	if isNumericLiteral(trimmed) {
		return trimmed
	}

	return quote.MysqlLiteral(trimmed)
}

func isCurrentDateTimeKeyword(upper string) bool {
	for _, prefix := range []string{"CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME"} {
		if upper == prefix {
			return true
		}

		if strings.HasPrefix(upper, prefix+"(") && strings.HasSuffix(upper, ")") {
			inner := strings.TrimSuffix(strings.TrimPrefix(upper, prefix+"("), ")")
			if ddl.DigitsOnly(inner) {
				return true
			}
		}
	}

	return false
}

func isMysqlCharacterType(dataType string) bool {
	characterTypes := []string{"char", "varchar", "text", "tinytext", "mediumtext", "longtext"}

	normalized := strings.ToLower(dataType)
	for _, t := range characterTypes {
		if normalized == t || strings.HasPrefix(normalized, t+"(") {
			return true
		}
	}

	return false
}

func isMysqlNumericType(dataType string) bool {
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

func inlineColumnDefinition(column *dto.MysqlTableColumnData) string {
	def := quote.MysqlIdent(*column.Name) + " " + formatColumnType(*column.DataType, column.MaxLength, column.NumericScale)

	if lo.FromPtr(column.NotNull) {
		def += " NOT NULL"
	}

	if lo.FromPtr(column.IsIdentity) {
		def += " AUTO_INCREMENT"
	}

	if column.Default != nil && *column.Default != "" {
		def += " DEFAULT " + formatDefault(*column.Default)
	}

	if column.Comment != nil && *column.Comment != "" {
		def += " COMMENT " + quote.MysqlLiteral(*column.Comment)
	}

	return def
}

func mysqlEngine(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "INNODB":
		return "InnoDB"
	case "MYISAM":
		return "MyISAM"
	case "MEMORY", "CSV", "ARCHIVE", "BLACKHOLE", "FEDERATED", "MERGE", "NDBCLUSTER":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return ""
	}
}

func mysqlRowFormat(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "DEFAULT", "DYNAMIC", "FIXED", "COMPRESSED", "REDUNDANT", "COMPACT":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return ""
	}
}

func uniqueConstraintName(columns []string) string {
	if len(columns) == 0 {
		return "uniq_"
	}

	return "uniq_" + strings.Join(columns, "_")
}
