package databaseMssql

import "regexp"

// A type is spliced into DDL, so only type-name characters are accepted (no quotes, semicolons or comments).
var (
	viewHeaderPattern = regexp.MustCompile(`(?is)^\s*create\s+(or\s+(alter|replace)\s+)?view\b.*?\bas\b\s*(.*)$`)
	mssqlTypePattern  = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_ ]*(\((max|\d+)(, ?\d+)?\))?$`)
)
