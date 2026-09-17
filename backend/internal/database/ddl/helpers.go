package ddl

import "strings"

// PtrStringChanged reports whether newVal is a real change versus oldVal.
// A nil new value means the field was not submitted.
func PtrStringChanged(oldVal, newVal *string) bool {
	if newVal == nil {
		return false
	}

	if oldVal == nil {
		return true
	}

	return *oldVal != *newVal
}

// StringSlicesEqual compares two string slices in order.
func StringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}

	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}

	return true
}

// JoinQuoted quotes each identifier and joins with ", ".
func JoinQuoted(columns []string, quoteFn func(string) string) string {
	quoted := make([]string, len(columns))
	for i, col := range columns {
		quoted[i] = quoteFn(col)
	}

	return strings.Join(quoted, ", ")
}

// ReferentialAction returns a canonical ON UPDATE / ON DELETE action, or
// empty if the value is not in the SQL allowlist.
func ReferentialAction(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return ""
	}
}

// PostgresPersistence returns LOGGED, UNLOGGED, or TEMPORARY, or empty.
func PostgresPersistence(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "LOGGED", "UNLOGGED", "TEMPORARY":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return ""
	}
}

// PostgresIndexMethod returns a canonical access method name, or empty.
func PostgresIndexMethod(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "btree", "hash", "gist", "gin", "spgist", "brin":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

// SqliteOnConflict returns a canonical ON CONFLICT action, or empty.
func SqliteOnConflict(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "ROLLBACK", "ABORT", "FAIL", "IGNORE", "REPLACE":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return ""
	}
}

// IndexOrder returns ASC or DESC, or empty.
func IndexOrder(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "ASC", "DESC":
		return strings.ToUpper(strings.TrimSpace(value))
	default:
		return ""
	}
}

// SQLExpression returns value when it is a single expression (no statement
// separators). Empty means the caller must omit the clause.
func SQLExpression(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	if strings.Contains(trimmed, ";") || strings.Contains(trimmed, "--") || strings.Contains(trimmed, "/*") {
		return ""
	}

	return trimmed
}

// DigitsOnly reports whether value is a non-empty decimal integer.
func DigitsOnly(value string) bool {
	if value == "" {
		return false
	}

	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}

	return true
}

// PtrStringsEqual treats nil and "" as equal after trim.
func PtrStringsEqual(a, b *string) bool {
	left := ""
	if a != nil {
		left = strings.TrimSpace(*a)
	}

	right := ""
	if b != nil {
		right = strings.TrimSpace(*b)
	}

	return left == right
}
