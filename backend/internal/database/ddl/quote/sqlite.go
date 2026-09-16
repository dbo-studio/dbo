package ddlQuote

import "strings"

// SqliteIdent quotes an identifier for SQLite. Mirrors the historical
// driver behavior: embedded double quotes are stripped.
func SqliteIdent(name string) string {
	if name == "" {
		return name
	}

	return `"` + strings.ReplaceAll(name, `"`, "") + `"`
}
