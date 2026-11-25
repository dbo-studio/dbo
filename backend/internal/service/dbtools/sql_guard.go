package serviceDbtools

import (
	"fmt"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

const maxSQLRows = 100

// GuardReadOnlySQL checks that sql is one SELECT and caps its rows. The check is the
// dialect-neutral classifier, so Postgres-only syntax (ILIKE, ::casts, DISTINCT ON) passes.
func GuardReadOnlySQL(sql string) (string, error) {
	return GuardReadOnlySQLFor("", sql)
}

// GuardReadOnlySQLFor is GuardReadOnlySQL for one engine. T-SQL has no LIMIT, so SQL Server keeps
// the statement as written and relies on TruncateQueryResult for the row cap.
func GuardReadOnlySQLFor(connectionType, sql string) (string, error) {
	statement, err := readStatement(sql)
	if err != nil || connectionType == databaseContract.SQLServer {
		return statement, err
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

// ExplainStatement builds a plan-only statement for a single validated SELECT.
func ExplainStatement(engine, query string) (string, error) {
	statement, err := GuardExplainSQL(query)
	if err != nil {
		return "", err
	}

	switch {
	case databaseContract.IsPostgresFamily(engine), databaseContract.IsMysqlFamily(engine), engine == databaseContract.ClickHouse:
		return "EXPLAIN " + statement, nil
	case engine == databaseContract.Sqlite:
		return "EXPLAIN QUERY PLAN " + statement, nil
	default:
		return "", fmt.Errorf("query plans are not available for %s connections", engine)
	}
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
