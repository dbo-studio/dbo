package serviceQuestion

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/samber/lo"
)

// A report's SQL may hold {{name}} filters, optionally typed: {{n:number}}, {{d:date}}, {{b:boolean}},
// {{r:range}} (value "low..high") or {{f:field=table.column}}. Every run fills them from the values sent, as
// bound parameters: a value reaches the database as data, never as part of the statement.
var (
	paramPattern = regexp.MustCompile(`\{\{\s*([A-Za-z_]\w*)\s*(?::\s*([a-z]+)\s*(?:=\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s*)?)?\}\}`)
	numberValue  = regexp.MustCompile(`^-?\d+(\.\d+)?$`)
	dateValue    = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$`)
	// FieldPattern is a bare table.column; it is written into SQL unquoted, so nothing else may pass.
	FieldPattern = regexp.MustCompile(`^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$`)
)

var errParamNul = errors.New("a filter value cannot contain a NUL character")

// Decl is one filter a report's SQL declares.
type Decl struct {
	Name  string
	Type  string
	Field string
}

// Declared lists the filters in a report's SQL, each name once (its first use wins), in order.
func Declared(sql string) []Decl {
	var out []Decl

	seen := map[string]bool{}

	for _, match := range paramPattern.FindAllStringSubmatch(sql, -1) {
		if !seen[match[1]] {
			seen[match[1]] = true
			out = append(out, Decl{Name: match[1], Type: match[2], Field: match[3]})
		}
	}

	return out
}

// bound collects the placeholders and values of one statement.
type bound struct {
	// numbered is PostgreSQL's $1, $2 style; the other engines take ? in order.
	numbered bool
	args     []any
}

// add binds a value and returns its placeholder. cast is a PostgreSQL type to pin an otherwise untyped value to
// (the server cannot infer a type for a bare $1); other engines ignore it.
func (b *bound) add(value any, cast string) string {
	b.args = append(b.args, value)

	if !b.numbered {
		return "?"
	}

	placeholder := "$" + strconv.Itoa(len(b.args))
	if cast != "" {
		placeholder += "::" + cast
	}

	return placeholder
}

// scalar is a number when it reads as one, otherwise text; the server settles the rest from the column it meets.
// PostgreSQL gets text only: it sends the value for the server to read as whatever type the place needs,
// where a Go number cannot be encoded into a parameter the server took to be text (SELECT {{x}}).
func (b *bound) scalar(value string) any {
	if b.numbered {
		return value
	}

	if numberValue.MatchString(value) {
		if n, err := strconv.ParseInt(value, 10, 64); err == nil {
			return n
		}

		if f, err := strconv.ParseFloat(value, 64); err == nil {
			return f
		}
	}

	return value
}

func (b *bound) param(kind, field, value string) (string, error) {
	switch kind {
	case "":
		return b.add(b.scalar(value), ""), nil
	case "text":
		return b.add(value, "text"), nil
	case "number":
		if !numberValue.MatchString(value) {
			return "", fmt.Errorf("%q is not a number", value)
		}

		return b.add(b.scalar(value), "numeric"), nil
	case "date":
		if !dateValue.MatchString(value) {
			return "", fmt.Errorf("%q is not a date (YYYY-MM-DD)", value)
		}

		return b.add(value, "date"), nil
	case "boolean":
		switch strings.ToLower(value) {
		case "true":
			return b.add(true, "boolean"), nil
		case "false":
			return b.add(false, "boolean"), nil
		}

		return "", fmt.Errorf("%q is not true or false", value)
	case "range":
		low, high, found := strings.Cut(value, "..")
		if !found || low == "" || high == "" {
			return "", fmt.Errorf("%q is not a range (low..high)", value)
		}

		return b.add(b.scalar(low), "") + " AND " + b.add(b.scalar(high), ""), nil
	case "field":
		return field + " = " + b.add(b.scalar(value), ""), nil
	}

	return "", fmt.Errorf("unknown filter type %q", kind)
}

// RenderParams replaces each {{filter}} with a placeholder and returns the values to bind to them, in order.
// numbered is set for PostgreSQL ($1, $2, ...); the other engines use ?. An empty field filter matches every row
// (1=1); any other empty filter fails.
func RenderParams(sql string, values map[string]string, numbered bool) (string, []any, error) {
	var (
		missing  []string
		firstErr error
	)

	b := &bound{numbered: numbered}

	rendered := paramPattern.ReplaceAllStringFunc(sql, func(match string) string {
		parts := paramPattern.FindStringSubmatch(match)
		name, kind, field := parts[1], parts[2], parts[3]
		value := values[name]

		switch {
		case (kind == "field") != (field != ""):
			firstErr = lo.Ternary(firstErr == nil, fmt.Errorf("{{%s}}: write a field filter as {{%s:field=table.column}}", name, name), firstErr)

			return match
		case value == "" && kind == "field":
			return "1=1"
		case value == "":
			missing = append(missing, name)

			return match
		case strings.ContainsRune(value, 0):
			firstErr = lo.Ternary(firstErr == nil, errParamNul, firstErr)

			return match
		}

		out, err := b.param(kind, field, value)
		if err != nil {
			firstErr = lo.Ternary(firstErr == nil, fmt.Errorf("{{%s}}: %w", name, err), firstErr)

			return match
		}

		return out
	})

	if firstErr != nil {
		return "", nil, firstErr
	}

	if len(missing) > 0 {
		return "", nil, fmt.Errorf("set a value for %s", strings.Join(lo.Uniq(missing), ", "))
	}

	return rendered, b.args, nil
}
