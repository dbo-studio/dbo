package databaseMongo

import (
	"strconv"
	"strings"
	"time"
	"unicode"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

// The shell accepts what people paste from mongosh: single quotes, unquoted keys, trailing commas, comments,
// ObjectId("..."), ISODate("..."), NumberLong(1), regex literals, and several statements. Everything is rewritten
// into Extended JSON before it is parsed or safety-checked, so the checks only ever see one shape.

// splitStatements cuts input at top-level semicolons, and at a line break before `db.`, `show ` or `use ` once the
// previous statement is complete. Quotes, comments and brackets are respected.
func splitStatements(input string) []string {
	var (
		parts      []string
		depth      int
		start      int
		quote      byte
		esc        bool
		lastSignif byte
	)

	flush := func(end int) {
		if s := strings.TrimSpace(input[start:end]); s != "" {
			parts = append(parts, s)
		}
	}

	for i := 0; i < len(input); i++ {
		ch := input[i]

		switch {
		case quote != 0:
			switch {
			case esc:
				esc = false
			case ch == '\\':
				esc = true
			case ch == quote:
				quote = 0
			}

			continue
		case ch == '"' || ch == '\'':
			quote, lastSignif = ch, ch
		case ch == '/' && i+1 < len(input) && input[i+1] == '/':
			for i < len(input) && input[i] != '\n' {
				i++
			}

			i--
		case ch == '/' && i+1 < len(input) && input[i+1] == '*':
			end := strings.Index(input[i+2:], "*/")
			if end < 0 {
				i = len(input)
			} else {
				i += end + 3
			}
		case ch == '(' || ch == '{' || ch == '[':
			depth++
			lastSignif = ch
		case ch == ')' || ch == '}' || ch == ']':
			depth--
			lastSignif = ch
		case ch == ';' && depth == 0:
			flush(i)
			start = i + 1
			lastSignif = 0
		case ch == '\n' && depth == 0 && lastSignif != 0 && statementEnd(lastSignif) && startsStatement(input[i+1:]):
			flush(i)
			start = i + 1
			lastSignif = 0
		case !unicode.IsSpace(rune(ch)):
			lastSignif = ch
		}
	}

	flush(len(input))

	return parts
}

func statementEnd(last byte) bool {
	return last == ')' || last == '"' || last == '\'' || last == '}' || last == ']' || last == '_' || unicode.IsLetter(rune(last)) || unicode.IsDigit(rune(last))
}

func startsStatement(rest string) bool {
	rest = strings.TrimLeft(rest, " \t\r")

	return strings.HasPrefix(rest, "db.") || strings.HasPrefix(rest, "show ") || strings.HasPrefix(rest, "use ")
}

// normalizeShell rewrites one statement into Extended JSON arguments.
func normalizeShell(s string) (string, error) {
	var (
		out   strings.Builder
		stack []byte // open brackets
		last  byte   // last significant byte written
	)

	write := func(text string) {
		out.WriteString(text)

		if t := strings.TrimRight(text, " \t\r\n"); t != "" {
			last = t[len(t)-1]
		}
	}

	i := 0

	for i < len(s) {
		ch := s[i]

		switch {
		case unicode.IsSpace(rune(ch)):
			out.WriteByte(ch)
			i++
		case ch == '/' && i+1 < len(s) && s[i+1] == '/':
			for i < len(s) && s[i] != '\n' {
				i++
			}
		case ch == '/' && i+1 < len(s) && s[i+1] == '*':
			end := strings.Index(s[i+2:], "*/")
			if end < 0 {
				return "", contract.Invalid("unterminated comment")
			}

			i += end + 4
		case ch == '"' || ch == '\'':
			text, next, err := readString(s, i)
			if err != nil {
				return "", err
			}

			write(strconv.Quote(text))

			i = next
		case ch == '/' && (last == ':' || last == '(' || last == ',' || last == '['):
			pattern, options, next, err := readRegex(s, i)
			if err != nil {
				return "", err
			}

			write(`{"$regularExpression":{"pattern":` + strconv.Quote(pattern) + `,"options":` + strconv.Quote(options) + `}}`)

			i = next
		case ch == '{' || ch == '[' || ch == '(':
			stack = append(stack, ch)

			write(string(ch))

			i++
		case ch == '}' || ch == ']' || ch == ')':
			if len(stack) > 0 {
				stack = stack[:len(stack)-1]
			}

			write(string(ch))

			i++
		case ch == ',':
			// A trailing comma is legal in the shell, not in JSON.
			if rest := strings.TrimLeft(s[i+1:], " \t\r\n"); rest != "" && (rest[0] == '}' || rest[0] == ']') {
				i++

				continue
			}

			write(",")

			i++
		case isIdentStart(ch):
			word, next := readWord(s, i)

			replacement, consumed, handled, err := shellValue(word, s, next)
			if err != nil {
				return "", err
			}

			switch {
			case handled:
				write(replacement)

				i = consumed
			case len(stack) > 0 && stack[len(stack)-1] == '{' && (last == '{' || last == ',') && nextIsColon(s, next):
				write(strconv.Quote(word))

				i = next
			default:
				write(word)

				i = next
			}
		default:
			write(string(ch))

			i++
		}
	}

	return out.String(), nil
}

func isIdentStart(ch byte) bool {
	return ch == '$' || ch == '_' || ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z'
}

func readWord(s string, i int) (string, int) {
	j := i

	for j < len(s) && (isIdentStart(s[j]) || s[j] >= '0' && s[j] <= '9' || s[j] == '.') {
		j++
	}

	return s[i:j], j
}

func nextIsColon(s string, i int) bool {
	rest := strings.TrimLeft(s[i:], " \t\r\n")

	return rest != "" && rest[0] == ':'
}

// readString reads a single- or double-quoted JS string starting at s[i] and returns its decoded text.
func readString(s string, i int) (string, int, error) {
	quote := s[i]

	var sb strings.Builder

	for j := i + 1; j < len(s); j++ {
		switch ch := s[j]; {
		case ch == '\\' && j+1 < len(s):
			j++

			switch s[j] {
			case 'n':
				sb.WriteByte('\n')
			case 't':
				sb.WriteByte('\t')
			case 'r':
				sb.WriteByte('\r')
			case 'u':
				if j+4 < len(s) {
					if n, err := strconv.ParseUint(s[j+1:j+5], 16, 32); err == nil {
						sb.WriteRune(rune(n))

						j += 4

						continue
					}
				}

				sb.WriteByte('u')
			default:
				sb.WriteByte(s[j])
			}
		case ch == quote:
			return sb.String(), j + 1, nil
		default:
			sb.WriteByte(ch)
		}
	}

	return "", 0, contract.Invalid("unterminated string")
}

// readRegex reads /pattern/flags.
func readRegex(s string, i int) (pattern, options string, next int, err error) {
	for j := i + 1; j < len(s); j++ {
		switch {
		case s[j] == '\\' && j+1 < len(s):
			j++
		case s[j] == '\n':
			return "", "", 0, contract.Invalid("unterminated regular expression")
		case s[j] == '/':
			k := j + 1
			for k < len(s) && strings.ContainsRune("gimsuy", rune(s[k])) {
				k++
			}

			return s[i+1 : j], strings.ReplaceAll(s[j+1:k], "g", ""), k, nil
		}
	}

	return "", "", 0, contract.Invalid("unterminated regular expression")
}

// shellValue rewrites the value constructors of mongosh. handled is false for any other identifier.
func shellValue(word, s string, next int) (replacement string, consumed int, handled bool, err error) {
	name := word

	if name == "new" {
		rest := strings.TrimLeft(s[next:], " ")
		if !strings.HasPrefix(rest, "Date") {
			return "", 0, false, nil
		}

		skip := len(s[next:]) - len(rest)
		name, next = "Date", next+skip+len("Date")
	}

	switch name {
	case "ObjectId", "ISODate", "Date", "NumberLong", "NumberInt", "NumberDecimal", "UUID", "Timestamp":
	default:
		return "", 0, false, nil
	}

	if !strings.HasPrefix(strings.TrimLeft(s[next:], " "), "(") {
		return "", 0, false, nil
	}

	open := next + strings.Index(s[next:], "(")

	end, err := closeParen(s[open+1:])
	if err != nil {
		return "", 0, false, err
	}

	arg := strings.TrimSpace(s[open+1 : open+1+end])
	consumed = open + 1 + end + 1
	text := unquote(arg)

	switch name {
	case "ObjectId":
		return `{"$oid":` + strconv.Quote(text) + `}`, consumed, true, nil
	case "UUID":
		return `{"$uuid":` + strconv.Quote(text) + `}`, consumed, true, nil
	case "NumberInt":
		return text, consumed, true, nil
	case "NumberLong":
		return `{"$numberLong":` + strconv.Quote(text) + `}`, consumed, true, nil
	case "NumberDecimal":
		return `{"$numberDecimal":` + strconv.Quote(text) + `}`, consumed, true, nil
	case "Timestamp":
		return "", 0, false, contract.Invalid("Timestamp is not supported")
	default: // ISODate, Date
		switch {
		case arg == "":
			return `{"$date":` + strconv.Quote(time.Now().UTC().Format(time.RFC3339Nano)) + `}`, consumed, true, nil
		case isNumber(text) && arg == text:
			return `{"$date":{"$numberLong":` + strconv.Quote(text) + `}}`, consumed, true, nil
		default:
			iso, ok := parseDate(text)
			if !ok {
				return "", 0, false, contract.Invalid("invalid date %q", text)
			}

			return `{"$date":` + strconv.Quote(iso) + `}`, consumed, true, nil
		}
	}
}

func unquote(arg string) string {
	if len(arg) >= 2 && (arg[0] == '"' || arg[0] == '\'') && arg[len(arg)-1] == arg[0] {
		if text, _, err := readString(arg, 0); err == nil {
			return text
		}
	}

	return arg
}

func isNumber(s string) bool {
	_, err := strconv.ParseInt(s, 10, 64)

	return err == nil
}

// parseDate accepts the date spellings the shell does and returns RFC 3339, which Extended JSON requires.
func parseDate(text string) (string, bool) {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05.999999999", "2006-01-02T15:04:05", "2006-01-02 15:04:05", "2006-01-02"} {
		if t, err := time.ParseInLocation(layout, text, time.UTC); err == nil {
			return t.UTC().Format(time.RFC3339Nano), true
		}
	}

	return "", false
}
