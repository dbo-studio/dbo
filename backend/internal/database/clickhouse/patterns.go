package databaseClickhouse

import "regexp"

// A type is spliced into DDL, so only type-name characters are accepted (no quotes, semicolons or comments).
var (
	clickhouseTypePattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_(), '.]*$`)
)
