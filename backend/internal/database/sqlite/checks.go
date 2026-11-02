package databaseSqlite

import (
	"strings"
	"unicode"
)

type tableCheck struct {
	Name       string
	Expression string
}

// parseChecks extracts every CHECK (...) from a CREATE TABLE statement,
// column-level ones included, with the CONSTRAINT name when present.
func parseChecks(tableDDL string) []tableCheck {
	var checks []tableCheck

	runes := []rune(tableDDL)
	quoteChar := rune(0)

	for i := 0; i < len(runes); i++ {
		c := runes[i]

		if quoteChar != 0 {
			if c == quoteChar {
				quoteChar = 0
			}

			continue
		}

		switch c {
		case '\'', '"', '`':
			quoteChar = c
			continue
		case '[':
			quoteChar = ']'
			continue
		}

		if !matchWord(runes, i, "CHECK") {
			continue
		}

		open := skipSpace(runes, i+len("CHECK"))
		if open >= len(runes) || runes[open] != '(' {
			continue
		}

		end := matchingParen(runes, open)
		if end < 0 {
			break
		}

		checks = append(checks, tableCheck{
			Name:       constraintNameBefore(runes, i),
			Expression: strings.TrimSpace(string(runes[open+1 : end])),
		})
		i = end
	}

	return checks
}

func matchWord(runes []rune, at int, word string) bool {
	if at > 0 && isIdentRune(runes[at-1]) {
		return false
	}

	end := at + len(word)
	if end > len(runes) || !strings.EqualFold(string(runes[at:end]), word) {
		return false
	}

	return end == len(runes) || !isIdentRune(runes[end])
}

func isIdentRune(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_'
}

func skipSpace(runes []rune, at int) int {
	for at < len(runes) && unicode.IsSpace(runes[at]) {
		at++
	}

	return at
}

// matchingParen returns the index of the ")" closing the "(" at open, or -1.
func matchingParen(runes []rune, open int) int {
	depth := 0
	quoteChar := rune(0)

	for i := open; i < len(runes); i++ {
		c := runes[i]

		if quoteChar != 0 {
			if c == quoteChar {
				quoteChar = 0
			}

			continue
		}

		switch c {
		case '\'', '"', '`':
			quoteChar = c
		case '(':
			depth++
		case ')':
			depth--
			if depth == 0 {
				return i
			}
		}
	}

	return -1
}

// constraintNameBefore returns N for "CONSTRAINT N CHECK", else "".
func constraintNameBefore(runes []rune, checkAt int) string {
	end := checkAt
	for end > 0 && unicode.IsSpace(runes[end-1]) {
		end--
	}

	start := end

	switch {
	case end > 0 && (runes[end-1] == '"' || runes[end-1] == '`' || runes[end-1] == ']'):
		open := map[rune]rune{'"': '"', '`': '`', ']': '['}[runes[end-1]]
		start = end - 1

		for start > 0 && runes[start-1] != open {
			start--
		}

		if start == 0 {
			return ""
		}

		start--
	default:
		for start > 0 && isIdentRune(runes[start-1]) {
			start--
		}
	}

	name := string(runes[start:end])
	before := strings.TrimSpace(string(runes[:start]))

	if !strings.HasSuffix(strings.ToUpper(before), "CONSTRAINT") {
		return ""
	}

	return strings.Trim(name, "\"`[]")
}
