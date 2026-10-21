package serviceDbtools

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
)

const maxSQLRows = 100

var limitPattern = regexp.MustCompile(`(?i)\blimit\b`)

func GuardReadOnlySQL(sql string) (string, error) {
	trimmed := strings.TrimSpace(sql)

	selectStmt, err := parseSelect(trimmed)
	if err != nil {
		return "", err
	}

	if selectStmt.Limit == nil && !limitPattern.MatchString(trimmed) {
		selectStmt.Limit = &sqlparser.Limit{
			Rowcount: sqlparser.NewIntVal([]byte(fmt.Sprintf("%d", maxSQLRows))),
		}
	}

	return sqlparser.String(selectStmt), nil
}

func TruncateQueryResult(data []map[string]any) []map[string]any {
	if len(data) <= maxSQLRows {
		return data
	}

	return data[:maxSQLRows]
}

// GuardExplainSQL checks that sql is one SELECT and returns it as parsed, without the row limit execute_sql adds,
// so the plan is the plan of the query as written.
func GuardExplainSQL(sql string) (string, error) {
	selectStmt, err := parseSelect(strings.TrimSpace(sql))
	if err != nil {
		return "", err
	}

	return sqlparser.String(selectStmt), nil
}

func parseSelect(sql string) (*sqlparser.Select, error) {
	if sql == "" {
		return nil, fmt.Errorf("sql is required")
	}

	stmt, err := sqlparser.Parse(sql)
	if err != nil {
		return nil, fmt.Errorf("invalid sql: %w", err)
	}

	selectStmt, ok := stmt.(*sqlparser.Select)
	if !ok {
		return nil, fmt.Errorf("only SELECT queries are allowed")
	}

	return selectStmt, nil
}
