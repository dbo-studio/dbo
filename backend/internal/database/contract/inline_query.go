package databaseContract

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	inlineForbiddenPattern = regexp.MustCompile(`(?i)(;|--|/\*|\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bOR\b|\bAND\b|[()])`)
	inlineColumnPattern    = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
)

// ParseInlineQueryPredicate converts a single grid inline condition (e.g.
// `name = 'Charlie'`) into a validated FilterDto. Arbitrary SQL fragments are
// rejected.
func ParseInlineQueryPredicate(inline string) (FilterDto, error) {
	s := strings.TrimSpace(inline)
	if s == "" {
		return FilterDto{}, fmt.Errorf("empty inline query")
	}

	if inlineForbiddenPattern.MatchString(s) {
		return FilterDto{}, fmt.Errorf("inline query not allowed")
	}

	upper := strings.ToUpper(s)

	if strings.HasSuffix(upper, " IS NOT NULL") {
		col := strings.TrimSpace(s[:len(s)-len(" IS NOT NULL")])
		if !inlineColumnPattern.MatchString(col) {
			return FilterDto{}, fmt.Errorf("invalid column name")
		}

		return FilterDto{Column: col, Operator: "IS NOT NULL", Value: "", Next: "AND"}, nil
	}

	if strings.HasSuffix(upper, " IS NULL") {
		col := strings.TrimSpace(s[:len(s)-len(" IS NULL")])
		if !inlineColumnPattern.MatchString(col) {
			return FilterDto{}, fmt.Errorf("invalid column name")
		}

		return FilterDto{Column: col, Operator: "IS NULL", Value: "", Next: "AND"}, nil
	}

	if idx := strings.Index(upper, " LIKE "); idx > 0 {
		col := strings.TrimSpace(s[:idx])
		if !inlineColumnPattern.MatchString(col) {
			return FilterDto{}, fmt.Errorf("invalid column name")
		}

		pattern, err := parseSQLStringLiteral(strings.TrimSpace(s[idx+len(" LIKE "):]))
		if err != nil {
			return FilterDto{}, err
		}

		op, val := mapLikePattern(pattern)

		return FilterDto{Column: col, Operator: op, Value: val, Next: "AND"}, nil
	}

	for _, op := range []string{"!=", "<>", "<=", ">=", "=", "<", ">"} {
		idx := indexOperator(s, op)
		if idx < 0 {
			continue
		}

		col := strings.TrimSpace(s[:idx])
		if !inlineColumnPattern.MatchString(col) {
			return FilterDto{}, fmt.Errorf("invalid column name")
		}

		rawVal := strings.TrimSpace(s[idx+len(op):])

		val, err := parseInlineValue(rawVal)
		if err != nil {
			return FilterDto{}, err
		}

		if !FilterOperatorAllowed(op) {
			return FilterDto{}, fmt.Errorf("operator not allowed")
		}

		return FilterDto{Column: col, Operator: op, Value: val, Next: "AND"}, nil
	}

	return FilterDto{}, fmt.Errorf("could not parse inline query")
}

func indexOperator(s, op string) int {
	for i := 0; i <= len(s)-len(op); i++ {
		if s[i:i+len(op)] != op {
			continue
		}

		beforeOK := i == 0 || s[i-1] == ' '
		afterOK := i+len(op) == len(s) || s[i+len(op)] == ' '

		if beforeOK && afterOK {
			return i
		}
	}

	return -1
}

func parseInlineValue(raw string) (string, error) {
	if raw == "" {
		return "", fmt.Errorf("missing value")
	}

	if raw[0] == '\'' {
		return parseSQLStringLiteral(raw)
	}

	if strings.ContainsAny(raw, " \t") {
		return "", fmt.Errorf("invalid value")
	}

	return raw, nil
}

func parseSQLStringLiteral(raw string) (string, error) {
	if len(raw) < 2 || raw[0] != '\'' || raw[len(raw)-1] != '\'' {
		return "", fmt.Errorf("invalid string literal")
	}

	inner := raw[1 : len(raw)-1]
	if strings.Contains(inner, "'") {
		return "", fmt.Errorf("invalid string literal")
	}

	return inner, nil
}

func mapLikePattern(pattern string) (operator, value string) {
	if strings.HasPrefix(pattern, "%") && strings.HasSuffix(pattern, "%") && len(pattern) >= 2 {
		return "LIKE_CONTAINS", strings.Trim(pattern, "%")
	}

	if strings.HasSuffix(pattern, "%") {
		return "LIKE_STARTS", strings.TrimSuffix(pattern, "%")
	}

	if strings.HasPrefix(pattern, "%") {
		return "LIKE_ENDS", strings.TrimPrefix(pattern, "%")
	}

	return "=", pattern
}
