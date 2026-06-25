package dto

import (
	"fmt"
	"strings"
)

func FilterRequiresValue(operator string) bool {
	return operator != "IS NULL" && operator != "IS NOT NULL"
}

func FilterIsLikeOperator(operator string) bool {
	switch operator {
	case "LIKE_CONTAINS", "LIKE_STARTS", "LIKE_ENDS":
		return true
	default:
		return false
	}
}

func escapeLikeValue(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, `%`, `\%`)
	value = strings.ReplaceAll(value, `_`, `\_`)
	return strings.ReplaceAll(value, "'", "''")
}

func escapeLiteralValue(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func FilterPredicate(operator, value string) string {
	switch operator {
	case "IS NULL", "IS NOT NULL":
		return operator
	case "LIKE_CONTAINS":
		return fmt.Sprintf("LIKE '%%%s%%'", escapeLikeValue(value))
	case "LIKE_STARTS":
		return fmt.Sprintf("LIKE '%s%%'", escapeLikeValue(value))
	case "LIKE_ENDS":
		return fmt.Sprintf("LIKE '%%%s'", escapeLikeValue(value))
	default:
		return fmt.Sprintf("%s '%s'", operator, escapeLiteralValue(value))
	}
}
