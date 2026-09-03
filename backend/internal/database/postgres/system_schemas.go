package databasePostgres

import "strings"

// postgresSystemSchemas are excluded from unscoped table/view/matview listings.
var postgresSystemSchemas = []string{"pg_catalog", "information_schema"}

func isPostgresSystemSchema(schema string) bool {
	for _, s := range postgresSystemSchemas {
		if schema == s {
			return true
		}
	}

	return strings.HasPrefix(schema, "pg_toast") || strings.HasPrefix(schema, "pg_temp")
}
