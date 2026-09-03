package databaseSqlite

import "strings"

func isSQLiteSystemTable(name string) bool {
	return strings.HasPrefix(name, "sqlite_")
}
