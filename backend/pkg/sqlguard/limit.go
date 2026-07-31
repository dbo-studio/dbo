package sqlguard

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
)

const (
	DefaultQueryLimit = 100
	MaxQueryLimit     = 10000
)

var rawLimitPattern = regexp.MustCompile(`(?i)\blimit\b`)

// LimitApplyResult is the outcome of optionally injecting LIMIT/OFFSET into a SELECT.
type LimitApplyResult struct {
	Query     string
	Paginated bool
}

// ResolveLimitPage returns a clamped limit and page (defaults: 100, 1).
func ResolveLimitPage(limit, page *int) (int, int) {
	resolvedLimit := DefaultQueryLimit
	resolvedPage := 1

	if limit != nil && *limit > 0 {
		resolvedLimit = *limit
	}
	if page != nil && *page > 0 {
		resolvedPage = *page
	}
	if resolvedLimit > MaxQueryLimit {
		resolvedLimit = MaxQueryLimit
	}

	return resolvedLimit, resolvedPage
}

func ApplyLimitOffset(sql string, limit, page int) LimitApplyResult {
	trimmed := strings.TrimSpace(sql)
	if trimmed == "" {
		return LimitApplyResult{Query: sql}
	}

	parts := splitStatements(trimmed)
	if len(parts) != 1 {
		return LimitApplyResult{Query: sql}
	}

	stmtSQL := strings.TrimRight(strings.TrimSpace(parts[0]), ";")

	stmt, err := sqlparser.Parse(stmtSQL)
	if err != nil {
		return LimitApplyResult{Query: sql}
	}

	selectStmt, ok := stmt.(*sqlparser.Select)
	if !ok {
		return LimitApplyResult{Query: sql}
	}

	if selectStmt.Limit != nil || rawLimitPattern.MatchString(stmtSQL) {
		return LimitApplyResult{Query: sql}
	}

	if limit < 1 {
		limit = DefaultQueryLimit
	}
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * limit
	rewritten := fmt.Sprintf("%s LIMIT %d OFFSET %d", stmtSQL, limit, offset)

	return LimitApplyResult{
		Query:     rewritten,
		Paginated: true,
	}
}
