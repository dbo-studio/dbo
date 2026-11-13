package serviceQuestion

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

var errNoSQLFieldFilter = fmt.Errorf("a field filter needs a SQL connection; use {{name}} or {{name:type}} in a MongoDB or Redis report")

// RenderNoSQLParams fills the {{filters}} of a MongoDB or Redis report. The query text is a JSON object, so values go
// in as JSON, never as text pasted into a query: a string that is only a filter ("{{n}}") becomes the typed value
// (a number, true/false, a {"$date": ...}), and a filter inside a longer string is replaced by its text. In a Redis
// command a value with spaces or quotes is quoted for the command line.
func RenderNoSQLParams(spec string, values map[string]string) (string, error) {
	if len(Declared(spec)) == 0 {
		return spec, nil
	}

	dec := json.NewDecoder(bytes.NewReader([]byte(spec)))
	dec.UseNumber()

	var doc any
	if err := dec.Decode(&doc); err != nil {
		return "", err
	}

	var (
		missing  []string
		firstErr error
	)

	fail := func(err error) {
		firstErr = lo.Ternary(firstErr == nil, err, firstErr)
	}

	var walk func(v any, inCommand bool) any

	walk = func(v any, inCommand bool) any {
		switch x := v.(type) {
		case map[string]any:
			for k, child := range x {
				x[k] = walk(child, k == "command")
			}

			return x
		case []any:
			for i, child := range x {
				x[i] = walk(child, inCommand)
			}

			return x
		case string:
			return renderString(x, values, inCommand, &missing, fail)
		}

		return v
	}

	out := walk(doc, false)

	if firstErr != nil {
		return "", firstErr
	}

	if len(missing) > 0 {
		return "", fmt.Errorf("set a value for %s", strings.Join(lo.Uniq(missing), ", "))
	}

	b, err := json.Marshal(out)

	return string(b), err
}

// renderString renders the filters in one JSON string value.
func renderString(s string, values map[string]string, inCommand bool, missing *[]string, fail func(error)) any {
	matches := paramPattern.FindAllStringSubmatchIndex(s, -1)
	if len(matches) == 0 {
		return s
	}

	// A string that is exactly one filter takes the filter's typed value.
	if len(matches) == 1 && matches[0][0] == 0 && matches[0][1] == len(s) && !inCommand {
		return typedValue(s, values, missing, fail)
	}

	var b strings.Builder

	last := 0

	for _, m := range matches {
		b.WriteString(s[last:m[0]])
		name, kind := s[m[2]:m[3]], ""

		if m[4] >= 0 {
			kind = s[m[4]:m[5]]
		}

		last = m[1]

		if kind == "field" || kind == "range" {
			fail(errNoSQLFieldFilter)

			continue
		}

		value := values[name]
		if value == "" {
			*missing = append(*missing, name)

			continue
		}

		if strings.ContainsRune(value, 0) {
			fail(errParamNul)

			continue
		}

		if inCommand && strings.ContainsAny(value, " \t\"'\\") {
			value = `"` + strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(value) + `"`
		}

		b.WriteString(value)
	}

	b.WriteString(s[last:])

	return b.String()
}

// typedValue renders a whole-string filter as a JSON value of the filter's type.
func typedValue(s string, values map[string]string, missing *[]string, fail func(error)) any {
	parts := paramPattern.FindStringSubmatch(s)
	name, kind := parts[1], parts[2]

	if kind == "field" || kind == "range" {
		fail(errNoSQLFieldFilter)

		return s
	}

	value := values[name]

	switch {
	case value == "":
		*missing = append(*missing, name)

		return s
	case strings.ContainsRune(value, 0):
		fail(errParamNul)

		return s
	}

	switch kind {
	case "number":
		if !numberValue.MatchString(value) {
			fail(fmt.Errorf("{{%s}}: %q is not a number", name, value))

			return s
		}

		return json.Number(value)
	case "date":
		if !dateValue.MatchString(value) {
			fail(fmt.Errorf("{{%s}}: %q is not a date (YYYY-MM-DD)", name, value))

			return s
		}

		return map[string]any{"$date": toISO(value)}
	case "boolean":
		switch strings.ToLower(value) {
		case "true":
			return true
		case "false":
			return false
		}

		fail(fmt.Errorf("{{%s}}: %q is not true or false", name, value))

		return s
	case "text":
		return value
	case "":
		// Untyped: a number when it reads as one, otherwise text.
		if numberValue.MatchString(value) {
			return json.Number(value)
		}

		return value
	}

	fail(fmt.Errorf("{{%s}}: unknown filter type %q", name, kind))

	return s
}

// toISO turns YYYY-MM-DD or YYYY-MM-DD HH:MM into the UTC timestamp MongoDB reads.
func toISO(v string) string {
	v = strings.Replace(v, " ", "T", 1)
	if len(v) == len("2006-01-02") {
		return v + "T00:00:00Z"
	}

	if len(v) == len("2006-01-02T15:04") {
		return v + ":00Z"
	}

	return v + "Z"
}
