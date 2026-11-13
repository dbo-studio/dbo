package databaseMongo

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var _ contract.StatementWriter = (*Repository)(nil)

const (
	previewSample = 5
	// maxCapture bounds how many documents a write may touch for it to still be undoable.
	maxCapture = 200
	// maxCaptureBytes bounds the undo statements, which hold the documents as text.
	maxCaptureBytes = 1 << 20
)

// writeTarget is one write statement resolved to its database, collection and call.
type writeTarget struct {
	db   string
	coll *mongo.Collection
	cmd  *call
}

// target finds the one call in a statement text (an optional `use db;` may come first) and opens its collection.
func (r *Repository) target(c *mongo.Client, statement string) (*writeTarget, error) {
	parts, err := statements(statement)
	if err != nil {
		return nil, err
	}

	db := r.cliDB()

	var text string

	for _, p := range parts {
		if name, ok := strings.CutPrefix(p, "use "); ok {
			db = strings.TrimSpace(name)

			continue
		}

		if text != "" {
			return nil, contract.Invalid("one change holds one write statement; split the others into separate changes")
		}

		text = p
	}

	if text == "" {
		return nil, contract.Invalid("no statement to preview")
	}

	cmd, err := parseCall(text)
	if err != nil {
		return nil, err
	}

	if cmd.method != "createCollection" && cmd.coll == "" {
		return nil, contract.Invalid("expected db.<collection>.<method>(...)")
	}

	t := &writeTarget{db: db, cmd: cmd}
	if cmd.coll != "" {
		t.coll = c.Database(db).Collection(cmd.coll)
	}

	return t, nil
}

// filterOf is the first argument of a write that matches documents; limit 1 for the *One methods.
func filterOf(cmd *call) (bson.D, int64, error) {
	filter, err := argDoc(cmd.args, 0)
	if err != nil {
		return nil, 0, err
	}

	switch cmd.method {
	case "updateOne", "replaceOne", "deleteOne", "findOneAndUpdate", "findOneAndReplace", "findOneAndDelete":
		return filter, 1, nil
	}

	return filter, 0, nil
}

func (r *Repository) PreviewStatement(ctx context.Context, statement string) (*contract.WritePreview, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	t, err := r.target(c, statement)
	if err != nil {
		return nil, err
	}

	switch t.cmd.method {
	case "insertOne":
		doc, err := argDoc(t.cmd.args, 0)
		if err != nil {
			return nil, err
		}

		text, _ := canonical(doc)

		return &contract.WritePreview{Affected: 1, Sample: []string{text}}, nil
	case "insertMany":
		if len(t.cmd.args) == 0 {
			return nil, contract.Invalid("insertMany needs an array of documents")
		}

		arr, err := argArray(t.cmd.args[0])
		if err != nil {
			return nil, err
		}

		out := &contract.WritePreview{Affected: int64(len(arr))}

		for i := 0; i < len(arr) && i < previewSample; i++ {
			text, _ := canonical(arr[i])
			out.Sample = append(out.Sample, text)
		}

		return out, nil
	case "updateOne", "updateMany", "replaceOne", "deleteOne", "deleteMany", "findOneAndUpdate", "findOneAndReplace", "findOneAndDelete":
		filter, one, err := filterOf(t.cmd)
		if err != nil {
			return nil, err
		}

		preview, docs, err := r.matching(ctx, t, filter, one)
		if err != nil {
			return nil, err
		}

		switch t.cmd.method {
		case "updateOne", "updateMany", "replaceOne", "findOneAndUpdate", "findOneAndReplace":
			preview.Diff, preview.Note = diffDocs(t.cmd.method, docs, t.cmd.args)
		}

		return preview, nil
	case "createIndex", "dropIndex", "dropIndexes", "createCollection", "drop":
		return &contract.WritePreview{Note: "this changes the collection's structure, not documents"}, nil
	default:
		return &contract.WritePreview{Note: "the number of documents it changes is not known before it runs"}, nil
	}
}

// matching counts the documents a filter selects (a lower bound past the cap) and reads a few.
func (r *Repository) matching(ctx context.Context, t *writeTarget, filter bson.D, one int64) (*contract.WritePreview, []bson.D, error) {
	const countCap = 10000

	limit := int64(countCap)
	if one > 0 {
		limit = one
	}

	n, err := t.coll.CountDocuments(ctx, filter, options.Count().SetLimit(limit+1))
	if err != nil {
		return nil, nil, err
	}

	out := &contract.WritePreview{Affected: n}

	if n > limit {
		out.Affected, out.Capped = limit, one == 0
	}

	cur, err := t.coll.Find(ctx, filter, options.Find().SetLimit(previewSample))
	if err != nil {
		return nil, nil, err
	}

	var docs []bson.D
	if err := cur.All(ctx, &docs); err != nil {
		return nil, nil, err
	}

	for _, d := range docs {
		text, _ := canonical(d)
		out.Sample = append(out.Sample, text)
	}

	return out, docs, nil
}

// undoHead is how an undo statement names its database and collection.
func undoHead(db, coll string) string {
	return "use " + db + ";\n" + collRef(coll)
}

func (r *Repository) CaptureStatement(ctx context.Context, statement string) (*contract.StatementCapture, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	t, err := r.target(c, statement)
	if err != nil {
		return nil, err
	}

	head := func() string { return undoHead(t.db, t.cmd.coll) }

	switch t.cmd.method {
	case "insertOne", "insertMany":
		// An insert only knows its ids once it ran; its output names them.
		return &contract.StatementCapture{After: func(output any) []string {
			ids := insertedIDs(output)
			if len(ids) == 0 {
				return nil
			}

			list, _ := json.Marshal(ids)

			return []string{head() + `.deleteMany({"_id":{"$in":` + string(list) + `}})`}
		}}, nil
	case "deleteOne", "deleteMany", "findOneAndDelete":
		docs, note, err := r.capture(ctx, t)
		if err != nil || docs == nil {
			return &contract.StatementCapture{Note: note}, err
		}

		list := make([]string, 0, len(docs))
		for _, d := range docs {
			text, _ := canonical(d)
			list = append(list, text)
		}

		return &contract.StatementCapture{Undo: []string{head() + ".insertMany([" + strings.Join(list, ",") + "])"}}, nil
	case "updateOne", "updateMany", "replaceOne", "findOneAndUpdate", "findOneAndReplace":
		docs, note, err := r.capture(ctx, t)
		if err != nil || docs == nil {
			return &contract.StatementCapture{Note: note}, err
		}

		out := &contract.StatementCapture{}

		for _, d := range docs {
			id, ok := docID(d)
			if !ok {
				continue
			}

			idText, _ := canonical(bson.D{{Key: "_id", Value: id}})
			text, _ := canonical(d)
			out.Undo = append(out.Undo, head()+".replaceOne("+idText+", "+text+")")
		}

		// A filter that matches nothing may upsert; that new document is not undone here.
		if hasUpsert(t.cmd) {
			out.Note = "an upsert that creates a document is not undone"
		}

		return out, nil
	case "createIndex":
		keys, err := argDoc(t.cmd.args, 0)
		if err != nil || len(keys) == 0 {
			return &contract.StatementCapture{Note: "it could not be read"}, nil
		}

		name := indexName(keys, t.cmd.args)

		return &contract.StatementCapture{Undo: []string{head() + `.dropIndex("` + name + `")`}}, nil
	case "createCollection":
		name, _ := stringArg(t.cmd.args, 0)
		if name == "" {
			return &contract.StatementCapture{Note: "it could not be read"}, nil
		}

		return &contract.StatementCapture{Undo: []string{undoHead(t.db, name) + ".drop()"}}, nil
	default:
		return &contract.StatementCapture{Note: "it loses what was there before"}, nil
	}
}

// capture reads the documents a write is about to change, when few enough to put back.
func (r *Repository) capture(ctx context.Context, t *writeTarget) ([]bson.D, string, error) {
	filter, one, err := filterOf(t.cmd)
	if err != nil {
		return nil, "", err
	}

	limit := int64(maxCapture + 1)
	if one > 0 {
		limit = one
	}

	cur, err := t.coll.Find(ctx, filter, options.Find().SetLimit(limit))
	if err != nil {
		return nil, "", err
	}

	var docs []bson.D
	if err := cur.All(ctx, &docs); err != nil {
		return nil, "", err
	}

	if len(docs) > maxCapture {
		return nil, fmt.Sprintf("it changes more than %d documents, too many to put back", maxCapture), nil
	}

	size := 0

	for _, d := range docs {
		text, _ := canonical(d)
		size += len(text)
	}

	if size > maxCaptureBytes {
		return nil, "the documents are too large to put back", nil
	}

	if docs == nil {
		docs = []bson.D{}
	}

	return docs, "", nil
}

func hasUpsert(cmd *call) bool {
	if len(cmd.args) < 3 {
		return false
	}

	opts, err := parseDoc(cmd.args[2])
	if err != nil {
		return false
	}

	for _, e := range opts {
		if e.Key == "upsert" && e.Value == true {
			return true
		}
	}

	return false
}

// indexName is the name MongoDB gives an index: its keys joined as field_direction, unless one was named.
func indexName(keys bson.D, args []string) string {
	if len(args) > 1 {
		if opts, err := parseDoc(args[1]); err == nil {
			for _, e := range opts {
				if s, ok := e.Value.(string); ok && e.Key == "name" {
					return s
				}
			}
		}
	}

	parts := make([]string, 0, len(keys)*2)

	for _, k := range keys {
		parts = append(parts, k.Key, fmt.Sprint(k.Value))
	}

	return strings.Join(parts, "_")
}

// insertedIDs reads the ids out of an insert's output (insertedId, or insertedIds for insertMany).
func insertedIDs(output any) []any {
	// A statement text with `use db;` in front answers with one output per statement.
	if list, ok := output.([]any); ok {
		for _, item := range list {
			if ids := insertedIDs(item); len(ids) > 0 {
				return ids
			}
		}

		return nil
	}

	m, ok := output.(map[string]any)
	if !ok {
		return nil
	}

	// One entry of a multi-statement answer: {"statement": ..., "output": ...}.
	if inner, ok := m["output"]; ok {
		return insertedIDs(inner)
	}

	// One entry of a multi-statement answer: {"statement": ..., "output": ...}.
	if inner, ok := m["output"]; ok {
		return insertedIDs(inner)
	}

	if list, ok := m["insertedIds"].([]any); ok {
		return list
	}

	if id, ok := m["insertedId"]; ok && id != nil {
		return []any{id}
	}

	return nil
}
