package ddlQuote

import "strings"

// SqliteIdent quotes an identifier per SQLite rules (double quotes,
// embedded quotes doubled).
func SqliteIdent(name string) string {
	if name == "" {
		return name
	}

	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}
