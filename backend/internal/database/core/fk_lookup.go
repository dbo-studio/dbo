package databaseCore

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

const (
	FkLookupDefaultLimit = 25
	FkLookupMaxLimit     = 50
	FkLookupTimeout      = 10 * time.Second
)

var preferredFkLabelNames = []string{
	"name", "title", "email", "username", "label", "code",
}

type FkLabelCandidate struct {
	Name         string
	MappedType   string
	IsPrimaryKey bool
}

type FkLookupDialect struct {
	QuoteIdent   func(name string) string
	CastToText   func(quotedIdent string) string
	LikeOperator string // ILIKE or LIKE
	FromClause   string
}

type FkLookupQuery struct {
	SQL  string
	Args []any
}

func ParseFkLookupLimit(raw string) int {
	if raw == "" {
		return FkLookupDefaultLimit
	}

	limit, err := strconv.Atoi(raw)
	if err != nil || limit < 1 {
		return FkLookupDefaultLimit
	}

	if limit > FkLookupMaxLimit {
		return FkLookupMaxLimit
	}

	return limit
}

func IsSensitiveLabelColumn(name string) bool {
	lower := strings.ToLower(strings.TrimSpace(name))
	for _, part := range []string{"password", "secret", "token", "hash", "api_key", "private_key", "ssn"} {
		if strings.Contains(lower, part) {
			return true
		}
	}

	return false
}

func isSearchableLabelType(mappedType string) bool {
	return mappedType == "" ||
		mappedType == MappedTypeString ||
		mappedType == MappedTypeUUID ||
		mappedType == MappedTypeEnum
}

func isKeyColumn(name string, keyColumns []string) bool {
	for _, key := range keyColumns {
		if strings.EqualFold(name, key) {
			return true
		}
	}

	return false
}

// PickFkLabelColumns chooses label/search columns.
// Preference: PRD name heuristics, then ordinal text columns, then first key.
func PickFkLabelColumns(keyColumns []string, columns []FkLabelCandidate) (label string, searchColumns []string) {
	if len(keyColumns) == 0 {
		return "", nil
	}

	primaryKey := keyColumns[0]
	suitableByName := make(map[string]string, len(columns))
	ordinal := make([]string, 0, 2)

	for _, column := range columns {
		if isKeyColumn(column.Name, keyColumns) || column.IsPrimaryKey {
			continue
		}

		if IsSensitiveLabelColumn(column.Name) {
			continue
		}

		if !isSearchableLabelType(column.MappedType) {
			continue
		}

		suitableByName[strings.ToLower(column.Name)] = column.Name
		if len(ordinal) < 2 {
			ordinal = append(ordinal, column.Name)
		}
	}

	preferred := make([]string, 0, 2)
	seen := make(map[string]struct{}, 2)

	for _, name := range preferredFkLabelNames {
		col, ok := suitableByName[name]
		if !ok {
			continue
		}

		if _, exists := seen[strings.ToLower(col)]; exists {
			continue
		}

		preferred = append(preferred, col)
		seen[strings.ToLower(col)] = struct{}{}

		if len(preferred) == 2 {
			break
		}
	}

	searchColumns = preferred
	if len(searchColumns) == 0 {
		searchColumns = ordinal
	} else if len(searchColumns) < 2 {
		for _, col := range ordinal {
			if _, exists := seen[strings.ToLower(col)]; exists {
				continue
			}

			searchColumns = append(searchColumns, col)
			if len(searchColumns) == 2 {
				break
			}
		}
	}

	if len(searchColumns) == 0 {
		return primaryKey, nil
	}

	return searchColumns[0], searchColumns
}

func EscapeLikePattern(q string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(q)
}

func FkLookupSearchPattern(q string) string {
	return "%" + EscapeLikePattern(q) + "%"
}

func QuotePGIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func QuoteMySQLIdent(name string) string {
	return "`" + strings.ReplaceAll(name, "`", "``") + "`"
}

func QuoteSQLiteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

// ParseFkKeyColumns reads keyColumns (comma-separated) or falls back to keyColumn.
func ParseFkKeyColumns(params map[string]string) []string {
	raw := strings.TrimSpace(params["keyColumns"])
	if raw == "" {
		raw = strings.TrimSpace(params["keyColumn"])
	}

	if raw == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	keys := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))

	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name == "" {
			continue
		}

		lower := strings.ToLower(name)
		if _, ok := seen[lower]; ok {
			continue
		}

		seen[lower] = struct{}{}

		keys = append(keys, name)
	}

	return keys
}

// ResolveFkKeyColumns maps requested key names onto actual table column names (EqualFold).
func ResolveFkKeyColumns(requested []string, tableColumns []FkLabelCandidate) ([]string, error) {
	if len(requested) == 0 {
		return nil, fmt.Errorf("keyColumn is required in parameters")
	}

	resolved := make([]string, 0, len(requested))
	for _, key := range requested {
		found := ""

		for _, column := range tableColumns {
			if strings.EqualFold(column.Name, key) {
				found = column.Name
				break
			}
		}

		if found == "" {
			return nil, fmt.Errorf("key column %q not found", key)
		}

		resolved = append(resolved, found)
	}

	return resolved, nil
}

// BuildFkLookupQuery builds a parameterized SELECT for FK autocomplete.
func BuildFkLookupQuery(
	dialect FkLookupDialect,
	keyColumns []string,
	labelColumn string,
	searchColumns []string,
	q string,
	limit int,
) FkLookupQuery {
	quotedKeys := make([]string, len(keyColumns))
	for i, key := range keyColumns {
		quotedKeys[i] = dialect.QuoteIdent(key)
	}

	selectParts := make([]string, 0, len(keyColumns)+1)
	for i, quoted := range quotedKeys {
		selectParts = append(selectParts, fmt.Sprintf("%s AS %s", dialect.CastToText(quoted), dialect.QuoteIdent(fmt.Sprintf("k%d", i))))
	}

	quotedLabel := dialect.QuoteIdent(labelColumn)
	if isKeyColumn(labelColumn, keyColumns) {
		selectParts = append(selectParts, fmt.Sprintf("%s AS %s", dialect.CastToText(quotedKeys[0]), dialect.QuoteIdent("label")))
	} else {
		selectParts = append(selectParts, fmt.Sprintf(
			"COALESCE(NULLIF(%s, ''), %s) AS %s",
			dialect.CastToText(quotedLabel),
			dialect.CastToText(quotedKeys[0]),
			dialect.QuoteIdent("label"),
		))
	}

	sql := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectParts, ", "), dialect.FromClause)
	args := make([]any, 0)

	if strings.TrimSpace(q) != "" {
		pattern := FkLookupSearchPattern(strings.TrimSpace(q))
		whereParts := make([]string, 0, len(keyColumns)+len(searchColumns))

		for _, quoted := range quotedKeys {
			whereParts = append(whereParts, fmt.Sprintf("%s %s ? ESCAPE '\\'", dialect.CastToText(quoted), dialect.LikeOperator))
			args = append(args, pattern)
		}

		for _, col := range searchColumns {
			if isKeyColumn(col, keyColumns) {
				continue
			}

			whereParts = append(whereParts, fmt.Sprintf("%s %s ? ESCAPE '\\'", dialect.CastToText(dialect.QuoteIdent(col)), dialect.LikeOperator))
			args = append(args, pattern)
		}

		sql += " WHERE " + strings.Join(whereParts, " OR ")
	}

	sql += fmt.Sprintf(" ORDER BY %s LIMIT ?", quotedKeys[0])

	args = append(args, limit)

	return FkLookupQuery{SQL: sql, Args: args}
}

func FormatFkOptionLabel(keyValues []string, label string) string {
	displayKeys := make([]string, 0, len(keyValues))
	for _, key := range keyValues {
		if key != "" {
			displayKeys = append(displayKeys, key)
		}
	}

	if len(displayKeys) == 0 {
		if label != "" {
			return label
		}

		return ""
	}

	keyPart := strings.Join(displayKeys, " · ")
	if label == "" || label == keyPart || (len(displayKeys) == 1 && label == displayKeys[0]) {
		return keyPart
	}

	for _, key := range displayKeys {
		if label == key {
			return keyPart
		}
	}

	return keyPart + " · " + label
}

// MakeFkLookupOption builds a FormFieldOption-compatible value/label pair.
// Single key → scalar string value; composite → map[string]string keyed by column name.
func MakeFkLookupOption(keyColumns []string, keyValues []string, label string) (value any, displayLabel string) {
	displayLabel = FormatFkOptionLabel(keyValues, label)

	if len(keyColumns) == 1 {
		val := ""
		if len(keyValues) > 0 {
			val = keyValues[0]
		}

		return val, displayLabel
	}

	m := make(map[string]string, len(keyColumns))
	for i, col := range keyColumns {
		if i < len(keyValues) {
			m[col] = keyValues[i]
		} else {
			m[col] = ""
		}
	}

	return m, displayLabel
}
