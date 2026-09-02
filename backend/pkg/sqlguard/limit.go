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

	if !canInjectLimit(stmtSQL) {
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

func canInjectLimit(sql string) bool {
	if rawLimitPattern.MatchString(sql) {
		return false
	}

	stmt, err := sqlparser.Parse(sql)
	if err != nil {
		return isWithSelect(sql)
	}

	selectStmt, ok := stmt.(*sqlparser.Select)
	if !ok {
		return false
	}

	return selectStmt.Limit == nil
}

// vitess-sqlparser does not accept WITH. Walk top-level tokens so we still
// page CTE SELECTs and leave WITH ... INSERT/UPDATE/DELETE alone.
func isWithSelect(sql string) bool {
	trimmed := strings.TrimSpace(sql)
	if len(trimmed) < 4 || !strings.EqualFold(trimmed[:4], "with") {
		return false
	}

	depth := 0
	for i := 0; i < len(trimmed); {
		c := trimmed[i]
		switch c {
		case '\'', '"', '`':
			i = skipQuoted(trimmed, i)
			continue
		case '(':
			depth++
		case ')':
			if depth > 0 {
				depth--
			}
		default:
			if depth == 0 && isIdentStart(c) {
				word, next := readWord(trimmed, i)
				switch strings.ToLower(word) {
				case "select":
					return true
				case "insert", "update", "delete":
					return false
				}

				i = next
				continue
			}
		}

		i++
	}

	return false
}

func skipQuoted(s string, i int) int {
	q := s[i]
	i++

	for i < len(s) {
		if s[i] != q {
			i++
			continue
		}

		if i+1 < len(s) && s[i+1] == q {
			i += 2
			continue
		}

		return i + 1
	}

	return i
}

func isIdentStart(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_'
}

func readWord(s string, i int) (string, int) {
	start := i
	i++

	for i < len(s) {
		c := s[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' {
			i++
			continue
		}

		break
	}

	return s[start:i], i
}
