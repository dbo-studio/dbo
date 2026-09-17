package ddlQuote

import "strings"

// MysqlIdent quotes an identifier per MySQL rules (backticks, embedded
// backticks doubled).
func MysqlIdent(name string) string {
	if name == "" {
		return name
	}

	return "`" + strings.ReplaceAll(name, "`", "``") + "`"
}

// MysqlLiteral quotes a string literal per MySQL rules (backslash then quotes).
func MysqlLiteral(value string) string {
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `'`, `''`)

	return "'" + escaped + "'"
}

// MysqlQualifiedTable quotes a database-qualified table reference.
func MysqlQualifiedTable(database, table string) string {
	if database == "" {
		return MysqlIdent(table)
	}

	return MysqlIdent(database) + "." + MysqlIdent(table)
}
