package serviceDbtools

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

const maxSQLRows = 100

// GuardReadOnlySQL checks that sql is one SELECT and caps its rows. The check is the
// dialect-neutral classifier, so Postgres-only syntax (ILIKE, ::casts, DISTINCT ON) passes.
func GuardReadOnlySQL(sql string) (string, error) {
	statement, err := readStatement(sql)
	if err != nil {
		return "", err
	}

	return sqlguard.ApplyLimitOffset(statement, maxSQLRows, 1).Query, nil
}

func TruncateQueryResult(data []map[string]any) []map[string]any {
	if len(data) <= maxSQLRows {
		return data
	}

	return data[:maxSQLRows]
}

// GuardExplainSQL checks that sql is one SELECT and returns it without the row limit execute_sql adds,
// so the plan is the plan of the query as written.
func GuardExplainSQL(sql string) (string, error) {
	return readStatement(sql)
}

func readStatement(sql string) (string, error) {
	if strings.TrimSpace(sql) == "" {
		return "", fmt.Errorf("sql is required")
	}

	statement, err := sqlguard.SelectStatement(sql)
	if err != nil {
		// Say where the statement belongs, so the model retries with the right tool instead of giving up.
		return "", fmt.Errorf("only SELECT queries are allowed here. To change data call preview_write with this statement " +
			"(Agent mode); to change the schema call propose_schema_change; in Ask mode give the SQL to the user instead")
	}

	return strings.TrimRight(strings.TrimSpace(statement), ";"), nil
}
