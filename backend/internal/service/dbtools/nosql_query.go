package serviceDbtools

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/goccy/go-json"
)

// maxReportRows bounds a NoSQL report like a SQL one: the chart and table never get more than this.
const maxReportRows = 100

// NoSQLQuerySpec is what a report on a MongoDB or Redis connection stores in its query text: one aggregation
// pipeline on a collection, or one read-only command. Which of the two is told by the field that is set.
type NoSQLQuerySpec struct {
	Container string          `json:"container,omitempty"`
	Pipeline  json.RawMessage `json:"pipeline,omitempty"`
	Command   string          `json:"command,omitempty"`
}

// NoSQLSpecFromArgs builds the stored query text from a tool call's arguments; pipeline is a JSON array as text.
func NoSQLSpecFromArgs(container, pipeline, command string) (string, error) {
	spec := NoSQLQuerySpec{Container: strings.TrimSpace(container), Command: strings.TrimSpace(command)}

	if p := strings.TrimSpace(pipeline); p != "" {
		spec.Pipeline = json.RawMessage(p)
	}

	if err := spec.validate(); err != nil {
		return "", err
	}

	b, err := json.Marshal(spec)

	return string(b), err
}

func (s *NoSQLQuerySpec) validate() error {
	hasPipeline, hasCommand := len(s.Pipeline) > 0, s.Command != ""

	switch {
	case hasPipeline == hasCommand:
		return fmt.Errorf("give either a pipeline (with its container) or a command, not both and not neither")
	case hasPipeline && s.Container == "":
		return fmt.Errorf("a pipeline needs its container (database/collection)")
	case hasPipeline && !json.Valid(s.Pipeline):
		return fmt.Errorf("the pipeline is not valid JSON")
	case hasPipeline && !strings.HasPrefix(strings.TrimSpace(string(s.Pipeline)), "["):
		return fmt.Errorf("the pipeline must be a JSON array of stages")
	}

	return nil
}

// ParseNoSQLQuerySpec reads and checks a stored query text.
func ParseNoSQLQuerySpec(text string) (*NoSQLQuerySpec, error) {
	var spec NoSQLQuerySpec
	if err := json.Unmarshal([]byte(text), &spec); err != nil {
		return nil, fmt.Errorf("a MongoDB or Redis report is a JSON object with a pipeline and container, or a command")
	}

	if err := spec.validate(); err != nil {
		return nil, err
	}

	return &spec, nil
}

// classifyNoSQLQuery is the driver's own verdict: only a read may be saved or run as a report.
func classifyNoSQLQuery(repo databaseContract.NoSQLRepository, spec *NoSQLQuerySpec) error {
	op := databaseContract.Operation{Name: "command", Raw: spec.Command}
	if len(spec.Pipeline) > 0 {
		op = databaseContract.Operation{Name: "aggregate", ContainerID: spec.Container, Raw: string(spec.Pipeline)}
	}

	if repo.Classify(op) != databaseContract.SafetyRead {
		return fmt.Errorf("a report only reads; this query is not a read")
	}

	return nil
}

// ValidateNoSQLQuery checks, without running it, that a query text is a well-formed read for the connection.
func (r *Registry) ValidateNoSQLQuery(ctx context.Context, connectionID int32, text string) error {
	spec, err := ParseNoSQLQuerySpec(text)
	if err != nil {
		return err
	}

	repo, err := r.nosqlRepo(ctx, connectionID)
	if err != nil {
		return err
	}

	return classifyNoSQLQuery(repo, spec)
}

// RunNoSQLQuery runs a stored query text and returns its rows in the shape a SQL report returns:
// {"query", "columns":[{name,type}], "rows", "count"}, so charts, boards, shares and subscriptions need no change.
func (r *Registry) RunNoSQLQuery(ctx context.Context, connectionID int32, text string) (string, error) {
	spec, err := ParseNoSQLQuerySpec(text)
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	repo, err := r.nosqlRepo(ctx, connectionID)
	if err != nil {
		return "", err
	}

	if err := classifyNoSQLQuery(repo, spec); err != nil {
		return "", err
	}

	var output any

	if len(spec.Pipeline) > 0 {
		a, ok := repo.(databaseContract.Aggregator)
		if !ok {
			return "", fmt.Errorf("aggregation is not available on this connection")
		}

		res, err := a.Aggregate(ctx, spec.Container, string(spec.Pipeline), maxReportRows)
		if err != nil {
			return "", err
		}

		docs := make([]any, 0, len(res.Docs))

		for _, d := range res.Docs {
			var v any
			if err := json.Unmarshal([]byte(d), &v); err != nil {
				return "", err
			}

			docs = append(docs, v)
		}

		output = docs
	} else {
		runner, ok := repo.(databaseContract.CommandRunner)
		if !ok {
			return "", fmt.Errorf("this connection has no command line")
		}

		res, err := runner.RunCommand(ctx, spec.Command)
		if err != nil {
			return "", err
		}

		output = res.Output
	}

	columns, rows := tabulate(output)

	raw, err := json.MarshalIndent(map[string]any{
		"query":   text,
		"columns": columns,
		"rows":    rows,
		"count":   len(rows),
	}, "", "  ")

	return string(raw), err
}

// tabulate turns a command's output into columns and rows: documents become rows with dotted column names,
// a list of values becomes a "value" column, and a map (a Redis hash) becomes key/value rows.
func tabulate(output any) ([]map[string]string, []map[string]any) {
	// Never nil: a report with no rows is an empty list, which is what charts and tables read.
	rows := []map[string]any{}

	switch v := output.(type) {
	case []any:
		for _, item := range v {
			if doc, ok := item.(map[string]any); ok {
				rows = append(rows, flatten(doc))
			} else {
				rows = append(rows, map[string]any{"value": plain(item)})
			}
		}
	case map[string]any:
		if isExtJSONValue(v) {
			rows = append(rows, map[string]any{"value": plain(v)})

			break
		}

		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}

		sort.Strings(keys)

		for _, k := range keys {
			rows = append(rows, map[string]any{"key": k, "value": plain(v[k])})
		}
	case nil:
	default:
		rows = append(rows, map[string]any{"value": plain(v)})
	}

	if len(rows) > maxReportRows {
		rows = rows[:maxReportRows]
	}

	order := []string{}
	seen := map[string]bool{}
	kinds := map[string]string{}

	for _, row := range rows {
		keys := make([]string, 0, len(row))
		for k := range row {
			keys = append(keys, k)
		}

		sort.Strings(keys)

		for _, k := range keys {
			if !seen[k] {
				seen[k] = true

				order = append(order, k)
			}

			if kinds[k] == "" && row[k] != nil {
				kinds[k] = kindOf(row[k])
			}
		}
	}

	columns := make([]map[string]string, 0, len(order))
	for _, k := range order {
		t := kinds[k]
		if t == "" {
			t = "string"
		}

		columns = append(columns, map[string]string{"name": k, "type": t})
	}

	return columns, rows
}

func kindOf(v any) string {
	switch v.(type) {
	case float64, int, int32, int64:
		return "number"
	case bool:
		return "boolean"
	default:
		return "string"
	}
}

// flatten joins nested documents into dotted column names; arrays stay as JSON text.
func flatten(doc map[string]any) map[string]any {
	out := map[string]any{}

	var walk func(prefix string, v any)

	walk = func(prefix string, v any) {
		if m, ok := v.(map[string]any); ok && !isExtJSONValue(m) {
			for k, child := range m {
				walk(prefix+"."+k, child)
			}

			return
		}

		out[prefix] = plain(v)
	}

	for k, v := range doc {
		walk(k, v)
	}

	return out
}

var extJSONKeys = map[string]bool{
	"$oid": true, "$date": true, "$numberInt": true, "$numberLong": true, "$numberDouble": true,
	"$numberDecimal": true, "$binary": true, "$timestamp": true, "$regularExpression": true, "$minKey": true, "$maxKey": true,
}

// isExtJSONValue reports whether m is one Extended JSON wrapper ({"$oid": ...}) rather than a nested document.
func isExtJSONValue(m map[string]any) bool {
	if len(m) == 0 {
		return false
	}

	for k := range m {
		if extJSONKeys[k] {
			return true
		}
	}

	return false
}

// plain turns an Extended JSON value into what a chart can use: numbers as numbers, dates and ids as text,
// everything else (arrays, other wrappers) as JSON text.
func plain(v any) any {
	switch x := v.(type) {
	case nil, bool, float64, string:
		return x
	case int:
		return float64(x)
	case int32:
		return float64(x)
	case int64:
		return parseNumber(strconv.FormatInt(x, 10))
	case map[string]any:
		if s, ok := x["$numberInt"].(string); ok {
			return parseNumber(s)
		}

		if s, ok := x["$numberLong"].(string); ok {
			return parseNumber(s)
		}

		if s, ok := x["$numberDouble"].(string); ok {
			return parseNumber(s)
		}

		if s, ok := x["$numberDecimal"].(string); ok {
			return parseNumber(s)
		}

		if s, ok := x["$oid"].(string); ok {
			return s
		}

		if d, ok := x["$date"]; ok {
			return dateText(d)
		}
	}

	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprint(v)
	}

	return string(b)
}

// parseNumber keeps a number a number; a 64-bit integer beyond a double's exact range stays text so it is not rounded.
func parseNumber(s string) any {
	if n, err := strconv.ParseInt(s, 10, 64); err == nil {
		if n > 1<<53 || n < -(1<<53) {
			return s
		}

		return float64(n)
	}

	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return f
	}

	return s
}

func dateText(d any) string {
	switch v := d.(type) {
	case string:
		return v
	case map[string]any:
		// Canonical form: {"$date": {"$numberLong": "<ms>"}}.
		if s, ok := v["$numberLong"].(string); ok {
			if ms, err := strconv.ParseInt(s, 10, 64); err == nil {
				return msToISO(ms)
			}
		}
	}

	return fmt.Sprint(d)
}

func msToISO(ms int64) string {
	return time.UnixMilli(ms).UTC().Format(time.RFC3339Nano)
}

// FlattenDocument turns a document (canonical or relaxed Extended JSON, decoded to maps) into dotted column names and
// plain values, the form a CSV row or a report row takes.
func FlattenDocument(doc map[string]any) map[string]any { return flatten(doc) }
