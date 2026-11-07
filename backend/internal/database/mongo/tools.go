package databaseMongo

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"sync"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/goccy/go-json"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const (
	bulkBatch       = 500
	defaultFindRows = 20
	maxFindRows     = 200
	maxInsertMany   = 500
)

// Classify rates one operation for Safe Mode. Raw holds the filter or command text.
func (r *Repository) Classify(op contract.Operation) contract.SafetyClass {
	switch op.Name {
	case "browse", "get":
		if checkJSON(op.Raw) != nil {
			return contract.SafetyBlocked
		}

		return contract.SafetyRead
	case "save", "insert":
		return contract.SafetyWrite
	case "delete":
		if op.Count > 1 {
			return contract.SafetyDestructive
		}

		return contract.SafetyWrite
	case "bulk-delete":
		return contract.SafetyDestructive
	case "command":
		return classifyCommand(op.Raw)
	default:
		return contract.SafetyBlocked
	}
}

func filterOrAll(pattern string) (bson.D, error) {
	if pattern == "*" {
		pattern = ""
	}

	return parseDoc(pattern)
}

// CountMatching counts documents matching the filter, stopping at limit.
func (r *Repository) CountMatching(ctx context.Context, containerID, pattern string, limit int) (int, bool, error) {
	filter, err := filterOrAll(pattern)
	if err != nil {
		return 0, false, err
	}

	c, err := r.client()
	if err != nil {
		return 0, false, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return 0, false, err
	}

	n, err := coll.CountDocuments(ctx, filter, options.Count().SetLimit(int64(limit)))
	if err != nil {
		return 0, false, err
	}

	return int(n), int(n) >= limit, nil
}

// DeleteMatching removes matches in batches of _id. Documents inserted while it runs may be caught or missed.
func (r *Repository) DeleteMatching(ctx context.Context, containerID, pattern string, progress func(int)) (int, error) {
	filter, err := filterOrAll(pattern)
	if err != nil {
		return 0, err
	}

	c, err := r.client()
	if err != nil {
		return 0, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return 0, err
	}

	total := 0

	for ctx.Err() == nil {
		cur, err := coll.Find(ctx, filter, options.Find().SetProjection(bson.D{{Key: "_id", Value: 1}}).SetLimit(bulkBatch))
		if err != nil {
			return total, err
		}

		var docs []bson.D
		if err := cur.All(ctx, &docs); err != nil {
			return total, err
		}

		if len(docs) == 0 {
			break
		}

		ids := make(bson.A, len(docs))
		for i, d := range docs {
			ids[i], _ = docID(d)
		}

		res, err := coll.DeleteMany(ctx, bson.D{{Key: "_id", Value: bson.D{{Key: "$in", Value: ids}}}})
		if err != nil {
			return total, err
		}

		if res.DeletedCount == 0 {
			break
		}

		total += int(res.DeletedCount)
		progress(total)
	}

	return total, ctx.Err()
}

// Snapshot keeps the document as canonical Extended JSON, so a restore brings back every BSON type.
func (r *Repository) Snapshot(ctx context.Context, containerID, itemID string) ([]byte, int64, bool, error) {
	c, err := r.client()
	if err != nil {
		return nil, 0, false, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, 0, false, err
	}

	var d bson.D

	err = coll.FindOne(ctx, bson.D{{Key: "_id", Value: parseID(itemID)}}).Decode(&d)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, 0, false, nil
	}

	if err != nil {
		return nil, 0, false, err
	}

	text, err := canonical(d)

	return []byte(text), 0, err == nil, err
}

// Restore inserts the snapshot again; it fails when a document with that _id exists.
func (r *Repository) Restore(ctx context.Context, containerID, _ string, payload []byte, _ int64) error {
	doc, err := parseDoc(string(payload))
	if err != nil {
		return err
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return err
	}

	if _, err := coll.InsertOne(ctx, doc); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return contract.Invalid("a document with this _id already exists")
		}

		return err
	}

	return nil
}

func int64Of(v any) int64 {
	switch x := v.(type) {
	case int32:
		return int64(x)
	case int64:
		return x
	case float64:
		return int64(x)
	default:
		return 0
	}
}

// Stats reports size and indexes of a collection.
func (r *Repository) Stats(ctx context.Context, containerID string) (*contract.ContainerStats, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	out := &contract.ContainerStats{Indexes: []contract.IndexInfo{}}

	cur, err := coll.Aggregate(ctx, bson.A{bson.D{{Key: "$collStats", Value: bson.D{{Key: "count", Value: bson.D{}}, {Key: "storageStats", Value: bson.D{}}}}}})
	if err != nil {
		return nil, err
	}

	var stats []bson.M
	if err := cur.All(ctx, &stats); err != nil {
		return nil, err
	}

	if len(stats) > 0 {
		out.Count = int64Of(stats[0]["count"])

		if st, ok := stats[0]["storageStats"].(bson.M); ok {
			out.Size, out.AvgObjSize, out.StorageSize = int64Of(st["size"]), int64Of(st["avgObjSize"]), int64Of(st["storageSize"])
		}
	}

	idx, err := coll.Indexes().List(ctx)
	if err != nil {
		return nil, err
	}

	var specs []bson.D
	if err := idx.All(ctx, &specs); err != nil {
		return nil, err
	}

	for _, spec := range specs {
		info := contract.IndexInfo{}

		for _, e := range spec {
			switch e.Key {
			case "name":
				info.Name, _ = e.Value.(string)
			case "key":
				b, _ := bson.MarshalExtJSON(e.Value, false, false)
				info.Keys = string(b)
			case "unique":
				info.Unique, _ = e.Value.(bool)
			}
		}

		out.Indexes = append(out.Indexes, info)
	}

	return out, nil
}

// ---- terminal -------------------------------------------------------------------------------------------------

// cliDBs remembers the database `use` selected, per (owner, connection).
var cliDBs sync.Map

func forgetCLI(owner string, connID uint) { cliDBs.Delete(clientKey{owner, connID}) }

func (r *Repository) cliDB() string {
	if v, ok := cliDBs.Load(clientKey{r.owner, r.conn.ID}); ok {
		return v.(string)
	}

	return r.defaultDB()
}

var readMethods = map[string]bool{"find": true, "findOne": true, "count": true, "countDocuments": true, "aggregate": true, "distinct": true, "getIndexes": true}
var writeMethods = map[string]bool{"insertOne": true, "insertMany": true, "updateOne": true, "updateMany": true, "replaceOne": true, "createIndex": true}
var destructiveMethods = map[string]bool{"deleteOne": true, "deleteMany": true}

func classifyCommand(raw string) contract.SafetyClass {
	if checkJSON(raw) != nil {
		return contract.SafetyBlocked
	}

	t := strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(raw), ";"))
	if t == "show dbs" || t == "show databases" || t == "show collections" || strings.HasPrefix(t, "use ") {
		return contract.SafetyRead
	}

	cmd, err := parseCall(t)
	if err != nil {
		return contract.SafetyBlocked
	}

	switch {
	case readMethods[cmd.method]:
		return contract.SafetyRead
	case writeMethods[cmd.method]:
		return contract.SafetyWrite
	case destructiveMethods[cmd.method]:
		return contract.SafetyDestructive
	default:
		return contract.SafetyBlocked
	}
}

type chained struct{ name, arg string }

type call struct {
	coll, method string
	args         []string
	chain        []chained
}

var callHead = regexp.MustCompile(`^db\.([^.(\s]+)\.(\w+)\(`)

// closeParen returns the index of the ")" matching the "(" just before s[0], honoring JSON strings and nesting.
func closeParen(s string) (int, error) {
	depth, inStr, esc := 1, false, false

	for i := 0; i < len(s); i++ {
		ch := s[i]

		switch {
		case inStr && esc:
			esc = false
		case inStr && ch == '\\':
			esc = true
		case ch == '"':
			inStr = !inStr
		case inStr:
		case ch == '(' || ch == '{' || ch == '[':
			depth++
		case ch == ')' || ch == '}' || ch == ']':
			depth--
			if depth == 0 {
				return i, nil
			}
		}
	}

	return 0, contract.Invalid("unbalanced parentheses")
}

// splitTop splits "a, b" at top-level commas.
func splitTop(s string) []string {
	var (
		parts        []string
		depth, start int
		inStr, esc   bool
	)

	for i := 0; i < len(s); i++ {
		ch := s[i]

		switch {
		case inStr && esc:
			esc = false
		case inStr && ch == '\\':
			esc = true
		case ch == '"':
			inStr = !inStr
		case inStr:
		case ch == '{' || ch == '[' || ch == '(':
			depth++
		case ch == '}' || ch == ']' || ch == ')':
			depth--
		case ch == ',' && depth == 0:
			parts = append(parts, strings.TrimSpace(s[start:i]))
			start = i + 1
		}
	}

	if tail := strings.TrimSpace(s[start:]); tail != "" {
		parts = append(parts, tail)
	}

	return parts
}

var chainHead = regexp.MustCompile(`^\.(\w+)\(`)

func parseCall(input string) (*call, error) {
	m := callHead.FindStringSubmatch(input)
	if m == nil {
		return nil, contract.Invalid(`expected db.<collection>.<method>(...); try: db.users.find({})`)
	}

	rest := input[len(m[0]):]

	end, err := closeParen(rest)
	if err != nil {
		return nil, err
	}

	c := &call{coll: m[1], method: m[2], args: splitTop(rest[:end])}
	rest = strings.TrimSpace(rest[end+1:])

	for rest != "" {
		h := chainHead.FindStringSubmatch(rest)
		if h == nil {
			return nil, contract.Invalid("unexpected text after the call: %q", rest)
		}

		rest = rest[len(h[0]):]

		end, err := closeParen(rest)
		if err != nil {
			return nil, err
		}

		c.chain = append(c.chain, chained{name: h[1], arg: strings.TrimSpace(rest[:end])})
		rest = strings.TrimSpace(rest[end+1:])
	}

	return c, nil
}

// generic turns BSON values into plain JSON values (relaxed Extended JSON) for the terminal.
func generic(v any) (any, error) {
	b, err := bson.MarshalExtJSON(bson.D{{Key: "v", Value: v}}, false, false)
	if err != nil {
		return nil, err
	}

	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}

	return m["v"], nil
}

func argDoc(args []string, i int) (bson.D, error) {
	if i >= len(args) {
		return bson.D{}, nil
	}

	return parseDoc(args[i])
}

func argArray(s string) (bson.A, error) {
	if err := checkJSON(s); err != nil {
		return nil, err
	}

	var d bson.D
	if err := bson.UnmarshalExtJSON([]byte(`{"v":`+s+`}`), false, &d); err != nil || len(d) != 1 {
		return nil, contract.Invalid("expected a JSON array")
	}

	arr, ok := d[0].Value.(bson.A)
	if !ok {
		return nil, contract.Invalid("expected a JSON array")
	}

	return arr, nil
}

func chainInt(c *call, name string, def int64) (int64, error) {
	for _, ch := range c.chain {
		if ch.name == name {
			n, err := strconv.ParseInt(ch.arg, 10, 64)
			if err != nil || n < 0 {
				return 0, contract.Invalid("%s needs a non-negative number", name)
			}

			return n, nil
		}
	}

	return def, nil
}

// RunCommand runs one mongosh-style line. It is a parser, not a JavaScript engine: arguments are JSON only.
func (r *Repository) RunCommand(ctx context.Context, input string) (*contract.CommandResult, error) {
	t := strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(input), ";"))
	if t == "" {
		return nil, contract.Invalid("empty command")
	}

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	switch {
	case t == "show dbs" || t == "show databases":
		names, err := c.ListDatabaseNames(ctx, bson.D{})

		return &contract.CommandResult{Output: names}, err
	case t == "show collections":
		names, err := c.Database(r.cliDB()).ListCollectionNames(ctx, bson.D{})

		return &contract.CommandResult{Output: names}, err
	case strings.HasPrefix(t, "use "):
		name := strings.TrimSpace(strings.TrimPrefix(t, "use "))
		if name == "" || strings.ContainsAny(name, "/\\. \"$*<>:|?") {
			return nil, contract.Invalid("invalid database name %q", name)
		}

		cliDBs.Store(clientKey{r.owner, r.conn.ID}, name)

		return &contract.CommandResult{Output: "switched to db " + name}, nil
	}

	cmd, err := parseCall(t)
	if err != nil {
		return nil, err
	}

	if classifyCommand(t) == contract.SafetyBlocked {
		return nil, contract.Invalid("%s is not supported in the terminal", cmd.method)
	}

	return r.exec(ctx, c.Database(r.cliDB()).Collection(cmd.coll), cmd)
}

func (r *Repository) exec(ctx context.Context, coll *mongo.Collection, cmd *call) (*contract.CommandResult, error) {
	wrap := func(v any, err error) (*contract.CommandResult, error) {
		if err != nil {
			return nil, err
		}

		out, err := generic(v)

		return &contract.CommandResult{Output: out}, err
	}

	switch cmd.method {
	case "find", "findOne":
		filter, err := argDoc(cmd.args, 0)
		if err != nil {
			return nil, err
		}

		if cmd.method == "find" {
			for _, ch := range cmd.chain {
				if ch.name == "count" {
					n, err := coll.CountDocuments(ctx, filter)

					return wrap(n, err)
				}
			}
		}

		limit, err := chainInt(cmd, "limit", defaultFindRows)
		if err != nil {
			return nil, err
		}

		skip, err := chainInt(cmd, "skip", 0)
		if err != nil {
			return nil, err
		}

		if cmd.method == "findOne" {
			limit = 1
		}

		opts := options.Find().SetLimit(min(limit, maxFindRows)).SetSkip(skip)

		if len(cmd.args) > 1 {
			proj, err := parseDoc(cmd.args[1])
			if err != nil {
				return nil, err
			}

			opts.SetProjection(proj)
		}

		for _, ch := range cmd.chain {
			if ch.name == "sort" {
				sort, err := parseDoc(ch.arg)
				if err != nil {
					return nil, err
				}

				opts.SetSort(sort)
			}
		}

		cur, err := coll.Find(ctx, filter, opts)
		if err != nil {
			return nil, err
		}

		var docs []bson.D
		if err := cur.All(ctx, &docs); err != nil {
			return nil, err
		}

		if cmd.method == "findOne" {
			if len(docs) == 0 {
				return &contract.CommandResult{Output: nil}, nil
			}

			return wrap(docs[0], nil)
		}

		return wrap(docs, nil)
	case "count", "countDocuments":
		filter, err := argDoc(cmd.args, 0)
		if err != nil {
			return nil, err
		}

		n, err := coll.CountDocuments(ctx, filter)

		return wrap(n, err)
	case "aggregate":
		if len(cmd.args) == 0 {
			return nil, contract.Invalid("aggregate needs a pipeline array")
		}

		stages, err := argArray(cmd.args[0])
		if err != nil {
			return nil, err
		}

		// A terminal prints rows, not whole collections.
		cur, err := coll.Aggregate(ctx, append(stages, bson.D{{Key: "$limit", Value: maxFindRows}}))
		if err != nil {
			return nil, err
		}

		var docs []bson.D
		if err := cur.All(ctx, &docs); err != nil {
			return nil, err
		}

		return wrap(docs, nil)
	case "distinct":
		if len(cmd.args) == 0 {
			return nil, contract.Invalid("distinct needs a field name")
		}

		filter, err := argDoc(cmd.args, 1)
		if err != nil {
			return nil, err
		}

		var vals bson.A

		field, _ := strconv.Unquote(cmd.args[0])
		if err := coll.Distinct(ctx, field, filter).Decode(&vals); err != nil {
			return nil, err
		}

		return wrap(vals, nil)
	case "getIndexes":
		cur, err := coll.Indexes().List(ctx)
		if err != nil {
			return nil, err
		}

		var specs []bson.D
		if err := cur.All(ctx, &specs); err != nil {
			return nil, err
		}

		return wrap(specs, nil)
	case "insertOne":
		doc, err := argDoc(cmd.args, 0)
		if err != nil {
			return nil, err
		}

		res, err := coll.InsertOne(ctx, doc)

		return wrap(bson.D{{Key: "insertedId", Value: insertedID(res)}}, err)
	case "insertMany":
		if len(cmd.args) == 0 {
			return nil, contract.Invalid("insertMany needs an array of documents")
		}

		arr, err := argArray(cmd.args[0])
		if err != nil {
			return nil, err
		}

		if len(arr) == 0 || len(arr) > maxInsertMany {
			return nil, contract.Invalid("insertMany takes 1 to %d documents", maxInsertMany)
		}

		res, err := coll.InsertMany(ctx, []any(arr))
		if err != nil {
			return nil, err
		}

		return wrap(bson.D{{Key: "insertedCount", Value: len(res.InsertedIDs)}}, nil)
	case "updateOne", "updateMany", "replaceOne":
		return r.update(ctx, coll, cmd)
	case "deleteOne", "deleteMany":
		filter, err := argDoc(cmd.args, 0)
		if err != nil {
			return nil, err
		}

		var res *mongo.DeleteResult

		if cmd.method == "deleteOne" {
			res, err = coll.DeleteOne(ctx, filter)
		} else {
			res, err = coll.DeleteMany(ctx, filter)
		}

		if err != nil {
			return nil, err
		}

		return wrap(bson.D{{Key: "deletedCount", Value: res.DeletedCount}}, nil)
	case "createIndex":
		keys, err := argDoc(cmd.args, 0)
		if err != nil || len(keys) == 0 {
			return nil, contract.Invalid("createIndex needs a keys document, e.g. {\"email\": 1}")
		}

		model := mongo.IndexModel{Keys: keys}

		if opts, err := argDoc(cmd.args, 1); err == nil {
			for _, e := range opts {
				if e.Key == "unique" {
					model.Options = options.Index().SetUnique(e.Value == true)
				}
			}
		}

		name, err := coll.Indexes().CreateOne(ctx, model)

		return wrap(name, err)
	default:
		return nil, contract.Invalid("%s is not supported in the terminal", cmd.method)
	}
}

func insertedID(res *mongo.InsertOneResult) any {
	if res == nil {
		return nil
	}

	return res.InsertedID
}

func (r *Repository) update(ctx context.Context, coll *mongo.Collection, cmd *call) (*contract.CommandResult, error) {
	if len(cmd.args) < 2 {
		return nil, contract.Invalid("%s needs a filter and a document", cmd.method)
	}

	filter, err := parseDoc(cmd.args[0])
	if err != nil {
		return nil, err
	}

	doc, err := parseDoc(cmd.args[1])
	if err != nil {
		return nil, err
	}

	var res *mongo.UpdateResult

	if cmd.method == "replaceOne" {
		res, err = coll.ReplaceOne(ctx, filter, doc)
	} else {
		// Without an operator the driver would reject it anyway; say why.
		if len(doc) == 0 || !strings.HasPrefix(doc[0].Key, "$") {
			return nil, contract.Invalid("%s needs update operators such as $set", cmd.method)
		}

		if cmd.method == "updateOne" {
			res, err = coll.UpdateOne(ctx, filter, doc)
		} else {
			res, err = coll.UpdateMany(ctx, filter, doc)
		}
	}

	if err != nil {
		return nil, err
	}

	out, err := generic(bson.D{{Key: "matchedCount", Value: res.MatchedCount}, {Key: "modifiedCount", Value: res.ModifiedCount}})

	return &contract.CommandResult{Output: out}, err
}
