package serviceDbtools

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/dbo-studio/dbo/internal/database"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/goccy/go-json"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/shared"
)

// Tools for NoSQL connections (MongoDB, Redis). They are read-only: every one goes through the driver's own
// Browse, Get, Describe or Classify, so what the assistant may read is what the app itself may read.
const (
	ToolListContainers    = "list_containers"
	ToolDescribeContainer = "describe_container"
	ToolBrowseContainer   = "browse_container"
	ToolGetItem           = "get_item"
	ToolRunCommand        = "run_command"
	ToolAggregate         = "aggregate"
	ToolReviewCollection  = "review_collection"
)

var noSQLTools = map[string]bool{
	ToolListContainers: true, ToolDescribeContainer: true, ToolBrowseContainer: true,
	ToolGetItem: true, ToolRunCommand: true, ToolAggregate: true, ToolReviewCollection: true,
	// Reports and charts: the same tools as SQL, with a pipeline or command in place of the SELECT.
	ToolShowChart: true, ToolSaveReport: true, ToolListReports: true, ToolPinReport: true,
}

// noSQLReportTools are the report tools the NoSQL set takes unchanged from the SQL one: they only name reports and boards.
// noSQLChartTools are run by their own paths (the chart through RunNoSQLQuery, the report through the question service).
var noSQLChartTools = map[string]bool{ToolShowChart: true, ToolSaveReport: true}

var noSQLReportTools = map[string]bool{ToolListReports: true, ToolPinReport: true}

// noSQLAgentTools are the tools only Agent mode has on a MongoDB or Redis connection: they propose writes, and the
// user reviews and applies them. A read-only connection never gets them.
var noSQLAgentTools = map[string]bool{ToolPreviewWrite: true, ToolUpdatePlan: true}

// AllowedNoSQLTool is the server-side list of tools a NoSQL chat turn may call.
func AllowedNoSQLTool(agent bool, tier, name string) bool {
	if noSQLAgentTools[name] {
		return agent && tier != TierReadOnly
	}

	return noSQLTools[name]
}

const (
	maxContainers    = 200
	maxBrowseItems   = 20
	maxItemText      = 8000
	maxToolOutput    = 12000
	maxAggregateDocs = 20
	describeSample   = 200
)

// NoSQLChatTools returns the tool definitions for a NoSQL connection.
func NoSQLChatTools(agent bool, tier string) []openai.ChatCompletionToolUnionParam {
	container := map[string]any{"type": "string", "description": "Container id as returned by list_containers (MongoDB: database/collection, Redis: db0)."}

	chartTypes := []string{"bar", "row", "line", "area", "pie", "number", "table", "combo", "scatter", "funnel", "gauge", "heatmap", "pivot", "trend"}
	queryProps := map[string]any{
		"container": map[string]any{"type": "string", "description": "MongoDB: the collection as database/collection. Needed with a pipeline."},
		"pipeline":  map[string]any{"type": "string", "description": "MongoDB: JSON array of aggregation stages that returns the label field first and the numbers after it, e.g. [{\"$group\":{\"_id\":\"$city\",\"n\":{\"$sum\":1}}}]. $out and $merge are refused."},
		"command":   map[string]any{"type": "string", "description": "A read-only MongoDB shell statement or Redis command, used instead of a pipeline. Put a filter inside a string, e.g. \"city\": \"{{city}}\" or GET user:{{id}}."},
	}
	chartProps := map[string]any{
		"type":    map[string]any{"type": "string", "enum": chartTypes, "description": "line or area for time, bar for categories, pie for a few shares of a whole, number for a single value."},
		"x":       map[string]any{"type": "string", "description": "Column for categories or time. Nested fields are columns named like address.city."},
		"y":       map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "Number columns to plot."},
		"stacked": map[string]any{"type": "boolean"},
		"group":   map[string]any{"type": "string", "description": "Second dimension for heatmap and pivot."},
		"size":    map[string]any{"type": "string", "description": "Number column that sizes scatter bubbles."},
		"goal":    map[string]any{"type": "number", "description": "What a gauge value is measured against."},
	}
	withQuery := func(extra map[string]any) map[string]any {
		props := map[string]any{"params": paramsSchema}
		for k, v := range queryProps {
			props[k] = v
		}

		for k, v := range chartProps {
			props[k] = v
		}

		for k, v := range extra {
			props[k] = v
		}

		return props
	}

	tools := []openai.ChatCompletionToolUnionParam{
		functionTool(ToolShowChart, "Show the user a chart of a read-only aggregation pipeline or command. Use it when the answer is numbers over categories or time. "+
			"At most 100 rows; documents become rows and nested fields become dotted columns. The rows come back to you too.", shared.FunctionParameters{
			"type":       "object",
			"properties": withQuery(map[string]any{"title": map[string]any{"type": "string", "description": "Short chart title."}}),
			"required":   []string{"title"},
		}),
		functionTool(ToolSaveReport, "Save a chart as a report the user can reopen and refresh later. Use it when the user asks to save, keep or pin a chart.", shared.FunctionParameters{
			"type":       "object",
			"properties": withQuery(map[string]any{"title": map[string]any{"type": "string"}}),
			"required":   []string{"title", "type"},
		}),
		functionTool(ToolListContainers, "List the containers of the connection: MongoDB collections as database/collection, Redis databases as db0, db1.", shared.FunctionParameters{
			"type": "object", "properties": map[string]any{},
		}),
		functionTool(ToolDescribeContainer, "Describe one container: field names and types, size and indexes (MongoDB), and what filter it accepts.", shared.FunctionParameters{
			"type": "object", "properties": map[string]any{"container": container}, "required": []string{"container"},
		}),
		functionTool(ToolBrowseContainer, "List up to 20 items of a container. MongoDB: filter is a JSON query like {\"age\":{\"$gt\":30}} and each item is a document. Redis: filter is a key pattern like user:*, and items are key names; use get_item for a value.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"container": container,
				"filter":    map[string]any{"type": "string", "description": "MongoDB JSON query or Redis key pattern. Empty lists everything."},
				"limit":     map[string]any{"type": "integer", "description": "Items to return, at most 20."},
			},
			"required": []string{"container"},
		}),
		functionTool(ToolGetItem, "Read one item: a MongoDB document by _id, or a Redis key's value.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"container": container,
				"item":      map[string]any{"type": "string", "description": "Document _id or key name."},
			},
			"required": []string{"container", "item"},
		}),
		functionTool(ToolRunCommand, "Run ONE read-only command. MongoDB: a shell statement such as db.users.countDocuments({age:{$gt:30}}), db.users.find({}).limit(5) or db.users.distinct(\"city\"). Redis: a command such as DBSIZE, TYPE key or HGETALL key. Anything that writes is refused.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"command": map[string]any{"type": "string", "description": "The statement or command."},
			},
			"required": []string{"command"},
		}),
		functionTool(ToolReviewCollection, "Review one MongoDB collection and list concrete suggestions: indexes that are unused, fields whose type changes between documents, a missing validation rule, a large collection with no index beyond _id. Each suggestion may carry a statement you can propose with preview_write.", shared.FunctionParameters{
			"type": "object", "properties": map[string]any{"container": container}, "required": []string{"container"},
		}),
		functionTool(ToolAggregate, "MongoDB only: run a read-only aggregation pipeline and return at most 20 documents. $out, $merge and JavaScript stages are refused.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"container": container,
				"pipeline":  map[string]any{"type": "string", "description": "JSON array of stages, e.g. [{\"$group\":{\"_id\":\"$city\",\"n\":{\"$sum\":1}}}]"},
			},
			"required": []string{"container", "pipeline"},
		}),
	}

	for _, t := range allChatTools(true) {
		if t.OfFunction == nil {
			continue
		}

		if name := t.OfFunction.Function.Name; noSQLReportTools[name] || name == ToolUpdatePlan && agent && tier != TierReadOnly {
			tools = append(tools, t)
		}
	}

	if agent && tier != TierReadOnly {
		tools = append(tools, functionTool(ToolPreviewWrite, "Preview write statements for the user to review: how many documents or keys each touches and a sample. "+
			"Nothing changes now. The statements join the user's proposal and run only when the user applies them, in order. "+
			"MongoDB: each statement is `use <database>;` then one call such as db.users.updateMany({ active: false }, { $set: { archived: true } }); "+
			"allowed: insertOne, insertMany, updateOne, updateMany, replaceOne, deleteOne, deleteMany, createIndex, dropIndex, createCollection, drop. "+
			"Redis: one command per statement such as SET key value, DEL key, HSET key field value, EXPIRE key 60; it runs on the connection's default database unless the statement starts with a line like SELECT 2. Wiping a whole database cannot be proposed.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"statements": map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "At most 20 write statements."},
			},
			"required": []string{"statements"},
		}))
	}

	return tools
}

func (r *Registry) nosqlRepo(ctx context.Context, connectionID int32) (databaseContract.NoSQLRepository, error) {
	conn, err := r.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return nil, fmt.Errorf("connection not found: %w", err)
	}

	return database.NewNoSQLRepository(ctx, conn, r.cm)
}

func argString(args map[string]any, key string) string {
	v, _ := args[key].(string)

	return strings.TrimSpace(v)
}

// executeNoSQL runs one NoSQL tool. ok is false when name is not a NoSQL tool.
func (r *Registry) executeNoSQL(ctx context.Context, name string, args map[string]any, toolCtx ToolContext) (string, bool, error) {
	if !noSQLTools[name] || noSQLChartTools[name] || noSQLReportTools[name] {
		return "", false, nil
	}

	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	repo, err := r.nosqlRepo(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", true, err
	}

	var out string

	switch name {
	case ToolListContainers:
		out, err = ListContainers(ctx, repo)
	case ToolDescribeContainer:
		out, err = describeContainer(ctx, repo, argString(args, "container"))
	case ToolBrowseContainer:
		out, err = browseContainer(ctx, repo, args)
	case ToolGetItem:
		out, err = getItem(ctx, repo, argString(args, "container"), argString(args, "item"))
	case ToolRunCommand:
		out, err = runCommand(ctx, repo, argString(args, "command"))
	case ToolAggregate:
		out, err = aggregate(ctx, repo, argString(args, "container"), argString(args, "pipeline"))
	case ToolReviewCollection:
		out, err = reviewCollection(ctx, repo, argString(args, "container"))
	}

	return truncateText(out, maxToolOutput), true, err
}

// ListContainers walks the driver's tree: a node with no children of its own that opens in Browse is a container.
func ListContainers(ctx context.Context, repo databaseContract.NoSQLRepository) (string, error) {
	root, err := repo.Tree(ctx, "")
	if err != nil {
		return "", err
	}

	var names []string

	for _, n := range root.Children {
		if len(names) >= maxContainers {
			break
		}

		if n.Type == databaseContract.TableNodeType {
			names = append(names, n.ID)

			continue
		}

		if !n.HasChildren {
			continue
		}

		sub, err := repo.Tree(ctx, n.ID)
		if err != nil {
			continue
		}

		for _, c := range sub.Children {
			if c.Type == databaseContract.TableNodeType && len(names) < maxContainers {
				names = append(names, c.ID)
			}
		}
	}

	return formatStringList(names), nil
}

func describeContainer(ctx context.Context, repo databaseContract.NoSQLRepository, container string) (string, error) {
	if container == "" {
		return "", fmt.Errorf("container is required")
	}

	spec, err := repo.Describe(ctx, container)
	if err != nil {
		return "", err
	}

	out := map[string]any{"filter": spec.Filter, "fields": spec.Fields}

	if p, ok := repo.(databaseContract.StatsProvider); ok {
		if st, err := p.Stats(ctx, container); err == nil {
			out["stats"] = st
		}
	}

	if t, ok := repo.(databaseContract.SchemaTools); ok {
		if a, err := t.Analyze(ctx, container, describeSample); err == nil {
			out["schema"] = a
		}
	}

	b, err := json.Marshal(out)

	return string(b), err
}

func browseContainer(ctx context.Context, repo databaseContract.NoSQLRepository, args map[string]any) (string, error) {
	container, filter := argString(args, "container"), argString(args, "filter")
	if container == "" {
		return "", fmt.Errorf("container is required")
	}

	limit := maxBrowseItems
	if n, ok := args["limit"].(float64); ok && int(n) > 0 {
		limit = min(int(n), maxBrowseItems)
	}

	q := databaseContract.BrowseQuery{Filter: filter, Limit: limit}
	if repo.Classify(databaseContract.Operation{Name: "browse", ContainerID: container, Raw: filter}) != databaseContract.SafetyRead {
		return "", fmt.Errorf("that filter is not allowed")
	}

	page, err := repo.Browse(ctx, container, q)
	if err != nil {
		return "", err
	}

	rows := make([]map[string]any, 0, len(page.Items))
	for _, it := range page.Items {
		row := map[string]any{"id": it.ID}
		if s, ok := it.Value.(string); ok && s != "" {
			row["value"] = truncateText(s, maxItemText)
		}

		rows = append(rows, row)
	}

	b, err := json.Marshal(map[string]any{"items": rows, "more": page.NextCursor != ""})

	return string(b), err
}

func getItem(ctx context.Context, repo databaseContract.NoSQLRepository, container, item string) (string, error) {
	if container == "" || item == "" {
		return "", fmt.Errorf("container and item are required")
	}

	it, err := repo.Get(ctx, container, item)
	if err != nil {
		return "", err
	}

	b, err := json.Marshal(map[string]any{"id": it.ID, "view": it.View, "value": it.Value, "meta": it.Meta})

	return truncateText(string(b), maxItemText), err
}

func runCommand(ctx context.Context, repo databaseContract.NoSQLRepository, command string) (string, error) {
	runner, ok := repo.(databaseContract.CommandRunner)
	if !ok {
		return "", fmt.Errorf("this connection has no command line")
	}

	if command == "" {
		return "", fmt.Errorf("command is required")
	}

	// Only what the driver itself rates as a read runs; writes and anything unknown are refused.
	if repo.Classify(databaseContract.Operation{Name: "command", Raw: command}) != databaseContract.SafetyRead {
		return "", fmt.Errorf("only read-only commands are allowed here; give the user the command to run themselves")
	}

	res, err := runner.RunCommand(ctx, command)
	if err != nil {
		return "", err
	}

	b, err := json.Marshal(res.Output)

	return string(b), err
}

func aggregate(ctx context.Context, repo databaseContract.NoSQLRepository, container, pipeline string) (string, error) {
	a, ok := repo.(databaseContract.Aggregator)
	if !ok {
		return "", fmt.Errorf("aggregation is not available on this connection")
	}

	if container == "" || pipeline == "" {
		return "", fmt.Errorf("container and pipeline are required")
	}

	if repo.Classify(databaseContract.Operation{Name: "aggregate", ContainerID: container, Raw: pipeline}) != databaseContract.SafetyRead {
		return "", fmt.Errorf("that pipeline is not allowed")
	}

	res, err := a.Aggregate(ctx, container, pipeline, maxAggregateDocs)
	if err != nil {
		return "", err
	}

	b, err := json.Marshal(map[string]any{"docs": res.Docs, "more": res.Truncated})

	return string(b), err
}

// reviewSuggestion is one finding of review_collection. Fix, when set, is a statement the assistant may propose.
type reviewSuggestion struct {
	Severity string `json:"severity"` // info | warning
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Fix      string `json:"fix,omitempty"`
}

const (
	reviewLargeCollection = 10000 // documents after which a collection with no index but _id is worth flagging
	reviewMixedShare      = 0.1   // the share of a field's values a second type must reach to count as mixed
)

// reviewCollection reads a collection's size, indexes, validator and sampled fields and turns them into suggestions.
func reviewCollection(ctx context.Context, repo databaseContract.NoSQLRepository, container string) (string, error) {
	if container == "" {
		return "", fmt.Errorf("container is required")
	}

	im, ok := repo.(databaseContract.IndexManager)
	if !ok {
		return "", fmt.Errorf("this connection cannot be reviewed")
	}

	db, coll, _ := strings.Cut(container, "/")
	head := "use " + db + ";\ndb.getCollection(" + fmt.Sprintf("%q", coll) + ")"
	out := []reviewSuggestion{}

	indexes, err := im.Indexes(ctx, container)
	if err != nil {
		return "", err
	}

	var count int64

	if p, ok := repo.(databaseContract.StatsProvider); ok {
		if st, err := p.Stats(ctx, container); err == nil {
			count = st.Count
		}
	}

	if count >= reviewLargeCollection && len(indexes) <= 1 {
		out = append(out, reviewSuggestion{Severity: "warning", Title: "No index besides _id",
			Detail: fmt.Sprintf("The collection has %d documents and every query that does not filter on _id scans all of them. Find the fields your queries filter or sort on and index them.", count)})
	}

	for _, ix := range indexes {
		// Usage counts since the server started; -1 means unknown, so an unknown index is never called unused.
		if ix.Name != "_id_" && ix.Ops == 0 && !ix.Unique && ix.TTLSecs == nil {
			out = append(out, reviewSuggestion{Severity: "info", Title: "Unused index " + ix.Name,
				Detail: "No query has used it since the server started. It still costs memory and slows every write. Check it is not for a rare job before dropping it.",
				Fix:    head + ".dropIndex(" + fmt.Sprintf("%q", ix.Name) + ")"})
		}
	}

	if t, ok := repo.(databaseContract.SchemaTools); ok {
		if v, err := t.GetValidator(ctx, container); err == nil && v.Validator == "" {
			out = append(out, reviewSuggestion{Severity: "info", Title: "No validation rule",
				Detail: "Any document shape can be written. A $jsonSchema validator in warn mode shows what breaks before it is enforced."})
		}

		if a, err := t.Analyze(ctx, container, describeSample); err == nil {
			for _, f := range a.Fields {
				if len(f.Types) < 2 || f.Count == 0 {
					continue
				}

				// MongoDB compares all number types as numbers, and "null" next to one real type is an optional value:
				// neither is mixed data.
				family := map[string]int{}

				for _, ty := range f.Types {
					switch ty.Type {
					case "null":
						continue
					case "int32", "int64", "double", "decimal128":
						family["number"] += ty.Count
					default:
						family[ty.Type] += ty.Count
					}
				}

				real := 0

				for _, n := range family {
					if float64(n)/float64(f.Count) >= reviewMixedShare {
						real++
					}
				}

				if real >= 2 {
					names := make([]string, 0, len(family))
					for ty, n := range family {
						names = append(names, fmt.Sprintf("%s (%d)", ty, n))
					}

					sort.Strings(names)

					out = append(out, reviewSuggestion{Severity: "warning", Title: "Mixed types in " + f.Path,
						Detail: "Values are stored as " + strings.Join(names, ", ") + ". Comparisons and sorts treat the types separately, so some documents are missed by a filter."})
				}
			}
		}
	}

	b, err := json.Marshal(map[string]any{"container": container, "documents": count, "suggestions": out})

	return string(b), err
}
