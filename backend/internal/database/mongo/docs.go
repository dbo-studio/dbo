package databaseMongo

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// maxJSON bounds one pasted filter or document.
const maxJSON = 4 << 20

// maxRowValue is the largest document Browse inlines per row, so a page of big documents stays small.
const maxRowValue = 16 << 10

// blockedOperators run JavaScript on the server or write outside the collection being browsed.
var blockedOperators = regexp.MustCompile(`(?i)"\$(where|function|accumulator|out|merge)"|\bmapReduce\b|\beval\b`)

var hex24 = regexp.MustCompile(`^[0-9a-fA-F]{24}$`)

// checkJSON rejects oversize input and operators that execute server-side code.
func checkJSON(text string) error {
	if len(text) > maxJSON {
		return contract.Invalid("input is larger than %d MiB", maxJSON>>20)
	}

	if m := blockedOperators.FindString(text); m != "" {
		return contract.Invalid("%s is not allowed", strings.Trim(m, `"`))
	}

	return nil
}

// parseDoc reads an Extended JSON object (relaxed or canonical).
func parseDoc(text string) (bson.D, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return bson.D{}, nil
	}

	if err := checkJSON(text); err != nil {
		return nil, err
	}

	var d bson.D
	if err := bson.UnmarshalExtJSON([]byte(text), false, &d); err != nil {
		return nil, contract.Invalid("invalid JSON: %v", err)
	}

	return d, nil
}

// canonical renders a value as canonical Extended JSON, which keeps every BSON type exact.
func canonical(v any) (string, error) {
	b, err := bson.MarshalExtJSON(v, true, false)

	return string(b), err
}

func docID(d bson.D) (any, bool) {
	for _, e := range d {
		if e.Key == "_id" {
			return e.Value, true
		}
	}

	return nil, false
}

// parseID turns the id shown in the UI back into the _id value: 24 hex digits are an ObjectId, JSON text is
// decoded, anything else is a string.
func parseID(s string) any {
	if hex24.MatchString(s) {
		if oid, err := bson.ObjectIDFromHex(s); err == nil {
			return oid
		}
	}

	t := strings.TrimSpace(s)
	if t != "" && strings.ContainsAny(t[:1], `{"-0123456789`) || t == "true" || t == "false" || t == "null" {
		var d bson.D
		if err := bson.UnmarshalExtJSON([]byte(`{"_id":`+t+`}`), false, &d); err == nil && len(d) == 1 {
			return d[0].Value
		}
	}

	return s
}

// idFilter matches the _id for a UI id. A 24-hex id also matches the same text stored as a string _id.
func idFilter(s string) bson.D {
	v := parseID(s)
	if _, ok := v.(bson.ObjectID); ok {
		return bson.D{{Key: "_id", Value: bson.D{{Key: "$in", Value: bson.A{v, s}}}}}
	}

	return bson.D{{Key: "_id", Value: v}}
}

// idString is the id shown in the UI. It always round-trips through parseID.
func idString(v any) string {
	switch x := v.(type) {
	case bson.ObjectID:
		return x.Hex()
	case string:
		if got, ok := parseID(x).(string); ok && got == x {
			return x
		}
	}

	c, err := canonical(bson.D{{Key: "_id", Value: v}})
	if err != nil {
		return ""
	}

	return strings.TrimSuffix(strings.TrimPrefix(c, `{"_id":`), "}")
}

// Browse pages documents by _id, or by offset when sorted. Paging by _id compares within one BSON type, so a collection that mixes _id
// types pages only through the first type; shortcut: switch to skip paging if that shows up in practice.
func (r *Repository) Browse(ctx context.Context, containerID string, q contract.BrowseQuery) (*contract.BrowsePage, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	filter, err := parseDoc(q.Filter)
	if err != nil {
		return nil, err
	}

	limit := q.ClampLimit(100)

	sort, err := sortDoc(q.Sorts)
	if err != nil {
		return nil, err
	}

	proj, err := projection(q.Projection)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetLimit(int64(limit) + 1)
	if proj != nil {
		opts.SetProjection(proj)
	}

	// Default order pages by an _id cursor; a custom sort pages by offset because its key is not unique.
	var offset int64

	if sort == nil {
		opts.SetSort(bson.D{{Key: "_id", Value: 1}})

		if q.Cursor != "" {
			filter = bson.D{{Key: "$and", Value: bson.A{filter, bson.D{{Key: "_id", Value: bson.D{{Key: "$gt", Value: parseID(q.Cursor)}}}}}}}
		}
	} else {
		opts.SetSort(append(sort, bson.E{Key: "_id", Value: 1})).SetCollation(&options.Collation{Locale: "en", NumericOrdering: true})

		if q.Cursor != "" {
			if offset, err = strconv.ParseInt(q.Cursor, 10, 64); err != nil || offset < 0 {
				return nil, contract.Invalid("invalid cursor")
			}

			opts.SetSkip(offset)
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

	page := &contract.BrowsePage{Items: make([]contract.Item, 0, min(len(docs), limit))}

	for i, d := range docs {
		id, _ := docID(d)

		if i == limit {
			// The extra row only proves there is a next page; it is fetched again from the cursor.
			if sort != nil {
				page.NextCursor = strconv.FormatInt(offset+int64(limit), 10)
			} else {
				prev, _ := docID(docs[limit-1])
				page.NextCursor = idString(prev)
			}

			break
		}

		text, err := canonical(d)
		if err != nil {
			return nil, err
		}

		item := contract.Item{ID: idString(id), View: contract.ViewDocument, Value: text, Meta: map[string]any{"type": "doc", "projected": proj != nil, "size": len(text)}}

		// A large document stays out of the list payload; the client loads it on demand through Get.
		if len(text) > maxRowValue {
			item.Value = nil
			item.Meta["truncated"] = true
		}

		page.Items = append(page.Items, item)
	}

	return page, nil
}

// sortDoc turns the requested sorts into an ordered sort document; nil means the default order.
func sortDoc(sorts []contract.BrowseSort) (bson.D, error) {
	var d bson.D

	for _, s := range sorts {
		if s.Field == "" {
			return nil, contract.Invalid("sort field is required")
		}

		dir := 1
		if s.Desc {
			dir = -1
		}

		d = append(d, bson.E{Key: s.Field, Value: dir})
	}

	return d, nil
}

// projection parses a projection document. _id stays included so every row keeps its identity.
func projection(text string) (bson.D, error) {
	p, err := parseDoc(text)
	if err != nil || len(p) == 0 {
		return nil, err
	}

	out := make(bson.D, 0, len(p))

	for _, e := range p {
		if e.Key == "_id" && isFalsy(e.Value) {
			continue
		}

		out = append(out, e)
	}

	return out, nil
}

func isFalsy(v any) bool {
	switch n := v.(type) {
	case bool:
		return !n
	case int32:
		return n == 0
	case int64:
		return n == 0
	case float64:
		return n == 0
	}

	return false
}

func (r *Repository) Get(ctx context.Context, containerID, itemID string) (*contract.Item, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	var d bson.D

	if err := coll.FindOne(ctx, idFilter(itemID)).Decode(&d); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, contract.Invalid("document %q does not exist", itemID)
		}

		return nil, err
	}

	text, err := canonical(d)
	if err != nil {
		return nil, err
	}

	return &contract.Item{ID: itemID, View: contract.ViewDocument, Value: text, Meta: map[string]any{"type": "doc", "size": len(text)}}, nil
}
