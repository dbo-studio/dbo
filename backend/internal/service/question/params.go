package serviceQuestion

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/samber/lo"
)

// A report's SQL may hold {{name}} filters, optionally typed: {{n:number}}, {{d:date}}, {{b:boolean}},
// {{r:range}} (value "low..high") or {{f:field=table.column}}. Every run fills them from the values sent.
var (
	paramPattern = regexp.MustCompile(`\{\{\s*([A-Za-z_]\w*)\s*(?::\s*([a-z]+)\s*(?:=\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s*)?)?\}\}`)
	numberValue  = regexp.MustCompile(`^-?\d+(\.\d+)?$`)
	dateValue    = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$`)
	// FieldPattern is a bare table.column; it is written into SQL unquoted, so nothing else may pass.
	FieldPattern = regexp.MustCompile(`^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$`)
)

var errParamNul = errors.New("a filter value cannot contain a NUL character")

// literal writes value as a SQL literal: plain numbers stay numbers, anything else is a quoted string.
func literal(value string, backslashEscapes bool) string {
	if numberValue.MatchString(value) {
		return value
	}

	if backslashEscapes {
		value = strings.ReplaceAll(value, `\`, `\\`)
	}

	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func renderParam(kind, field, value string, backslashEscapes bool) (string, error) {
	switch kind {
	case "":
		return literal(value, backslashEscapes), nil
	case "text":
		if numberValue.MatchString(value) {
			return "'" + value + "'", nil
		}
		return literal(value, backslashEscapes), nil
	case "number":
		if !numberValue.MatchString(value) {
			return "", fmt.Errorf("%q is not a number", value)
		}
		return value, nil
	case "date":
		if !dateValue.MatchString(value) {
			return "", fmt.Errorf("%q is not a date (YYYY-MM-DD)", value)
		}
		return "'" + value + "'", nil
	case "boolean":
		switch strings.ToLower(value) {
		case "true":
			return "TRUE", nil
		case "false":
			return "FALSE", nil
		}
		return "", fmt.Errorf("%q is not true or false", value)
	case "range":
		low, high, found := strings.Cut(value, "..")
		if !found || low == "" || high == "" {
			return "", fmt.Errorf("%q is not a range (low..high)", value)
		}
		return literal(low, backslashEscapes) + " AND " + literal(high, backslashEscapes), nil
	case "field":
		return field + " = " + literal(value, backslashEscapes), nil
	}

	return "", fmt.Errorf("unknown filter type %q", kind)
}

// RenderParams replaces each {{filter}} with its value as a SQL literal. backslashEscapes is set for MySQL,
// where a backslash escapes in strings. An empty field filter matches every row (1=1); any other empty filter fails.
// shortcut: values are inlined as escaped literals behind the read-only guard, not bound; bind them
// before a report runs for someone who does not own the connection (share links).
func RenderParams(sql string, values map[string]string, backslashEscapes bool) (string, error) {
	var (
		missing  []string
		firstErr error
	)

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

		out, err := renderParam(kind, field, value, backslashEscapes)
		if err != nil {
			firstErr = lo.Ternary(firstErr == nil, fmt.Errorf("{{%s}}: %w", name, err), firstErr)
			return match
		}

		return out
	})

	if firstErr != nil {
		return "", firstErr
	}

	if len(missing) > 0 {
		return "", fmt.Errorf("set a value for %s", strings.Join(lo.Uniq(missing), ", "))
	}

	return rendered, nil
}
