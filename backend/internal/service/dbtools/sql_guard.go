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
	if trimmed == "" {
		return "", fmt.Errorf("sql is required")
	}

	stmt, err := sqlparser.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("invalid sql: %w", err)
	}

	selectStmt, ok := stmt.(*sqlparser.Select)
	if !ok {
		return "", fmt.Errorf("only SELECT queries are allowed")
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
