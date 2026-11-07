package databaseMongo

import (
	"context"
	"errors"
	"regexp"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// maxJSON bounds one pasted filter or document.
const maxJSON = 4 << 20

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

// Browse pages documents by _id. Paging by _id compares within one BSON type, so a collection that mixes _id
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

	if q.Cursor != "" {
		filter = bson.D{{Key: "$and", Value: bson.A{filter, bson.D{{Key: "_id", Value: bson.D{{Key: "$gt", Value: parseID(q.Cursor)}}}}}}}
	}

	limit := q.ClampLimit(100)

	cur, err := coll.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "_id", Value: 1}}).SetLimit(int64(limit)+1))
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
			prev, _ := docID(docs[limit-1])
			page.NextCursor = idString(prev)

			break
		}

		page.Items = append(page.Items, contract.Item{ID: idString(id), View: contract.ViewDocument, Meta: map[string]any{"type": "doc"}})
	}

	return page, nil
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

	if err := coll.FindOne(ctx, bson.D{{Key: "_id", Value: parseID(itemID)}}).Decode(&d); err != nil {
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
