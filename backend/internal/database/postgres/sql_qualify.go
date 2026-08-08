package databasePostgres

import "fmt"

func qualifiedTableName(schema, table string) string {
	if schema != "" && table != "" {
		return fmt.Sprintf(`"%s"."%s"`, schema, table)
	}

	return table
}
