package ddlQuote

import "strings"

// PostgresIdent quotes an identifier per Postgres rules (double quotes,
// embedded quotes doubled).
func PostgresIdent(name string) string {
	if name == "" {
		return name
	}

	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

// PostgresLiteral quotes a string literal per Postgres rules.
func PostgresLiteral(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

// PostgresQualifiedTable quotes a schema-qualified table reference.
func PostgresQualifiedTable(schema, table string) string {
	if schema == "" {
		return PostgresIdent(table)
	}

	return PostgresIdent(schema) + "." + PostgresIdent(table)
}
