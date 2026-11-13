package databaseMongo

import (
	"context"
	"errors"
	"strconv"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const (
	maxChildren   = 200  // fields returned per Children call
	maxNodeString = 2000 // longest scalar text sent inline
)

// Children lists one level of the document. Only the first path segment is projected from the server, so a huge
// sibling field is not read.
func (r *Repository) Children(ctx context.Context, containerID, itemID string, path []string, offset, limit int) (*contract.DocChildren, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	opts := options.FindOne()
	if len(path) > 0 {
		if strings.HasPrefix(path[0], "$") {
			return nil, contract.Invalid("invalid path")
		}

		opts.SetProjection(bson.D{{Key: path[0], Value: 1}})
	}

	var doc bson.D
	if err := coll.FindOne(ctx, idFilter(itemID), opts).Decode(&doc); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, contract.Invalid("document %q does not exist", itemID)
		}

		return nil, err
	}

	node, ok := walk(doc, path)
	if !ok {
		return nil, contract.Invalid("path does not exist")
	}

	offset = max(offset, 0)
	if limit <= 0 || limit > maxChildren {
		limit = maxChildren
	}

	var out contract.DocChildren

	switch n := node.(type) {
	case bson.D:
		out.Total = len(n)
		for i := min(offset, len(n)); i < min(offset+limit, len(n)); i++ {
			out.Nodes = append(out.Nodes, docNode(n[i].Key, path, n[i].Value))
		}
	case bson.A:
		out.Total = len(n)
		for i := min(offset, len(n)); i < min(offset+limit, len(n)); i++ {
			out.Nodes = append(out.Nodes, docNode(strconv.Itoa(i), path, n[i]))
		}
	default:
		return nil, contract.Invalid("path is not an object or array")
	}

	return &out, nil
}

// walk follows path through nested documents and arrays.
func walk(root any, path []string) (any, bool) {
	cur := root

	for _, seg := range path {
		switch n := cur.(type) {
		case bson.D:
			found := false

			for _, e := range n {
				if e.Key == seg {
					cur, found = e.Value, true

					break
				}
			}

			if !found {
				return nil, false
			}
		case bson.A:
			i, err := strconv.Atoi(seg)
			if err != nil || i < 0 || i >= len(n) {
				return nil, false
			}

			cur = n[i]
		default:
			return nil, false
		}
	}

	return cur, true
}

func docNode(key string, parent []string, v any) contract.DocNode {
	n := contract.DocNode{Key: key, Path: append(append([]string{}, parent...), key), Type: bsonType(v)}

	switch x := v.(type) {
	case bson.D:
		n.Count = len(x)
	case bson.A:
		n.Count = len(x)
	default:
		n.Value, n.Truncated = scalarText(v)
	}

	return n
}

// scalarText renders a scalar as relaxed Extended JSON, cut at maxNodeString.
func scalarText(v any) (string, bool) {
	b, err := bson.MarshalExtJSON(bson.D{{Key: "v", Value: v}}, false, false)
	if err != nil {
		return "", false
	}

	text := strings.TrimSuffix(strings.TrimPrefix(string(b), `{"v":`), "}")
	if len(text) > maxNodeString {
		return text[:maxNodeString], true
	}

	return text, false
}

func bsonType(v any) string {
	switch v.(type) {
	case int32:
		return "int32"
	case int64:
		return "int64"
	case bson.Decimal128:
		return "decimal128"
	case bson.Binary:
		return "binary"
	case bson.Timestamp:
		return "timestamp"
	case bson.Regex:
		return "regex"
	default:
		return valueType(v)
	}
}

// fieldPath checks a path is safe to address with $set/$unset: no operators, no dotted keys, never _id.
func fieldPath(path []string) (string, error) {
	if len(path) == 0 || path[0] == "_id" {
		return "", contract.Invalid("this field cannot be changed")
	}

	for _, seg := range path {
		if seg == "" || strings.HasPrefix(seg, "$") || strings.Contains(seg, ".") {
			return "", contract.Invalid("invalid field name %q", seg)
		}
	}

	return strings.Join(path, "."), nil
}

func (r *Repository) SetField(ctx context.Context, containerID, itemID string, path []string, value, typeHint string) error {
	key, err := fieldPath(path)
	if err != nil {
		return err
	}

	if err := checkJSON(value); err != nil {
		return err
	}

	var wrapped bson.D
	if err := bson.UnmarshalExtJSON([]byte(`{"v":`+value+`}`), false, &wrapped); err != nil || len(wrapped) != 1 {
		return contract.Invalid("invalid value")
	}

	return r.updateByID(ctx, containerID, itemID, bson.D{{Key: "$set", Value: bson.D{{Key: key, Value: keepWidth(wrapped[0].Value, typeHint)}}}})
}

func (r *Repository) UnsetField(ctx context.Context, containerID, itemID string, path []string) error {
	key, err := fieldPath(path)
	if err != nil {
		return err
	}

	return r.updateByID(ctx, containerID, itemID, bson.D{{Key: "$unset", Value: bson.D{{Key: key, Value: ""}}}})
}

// keepWidth stops an edited number from changing BSON type: relaxed JSON reads 7 as int32 even when the field was int64.
func keepWidth(v any, hint string) any {
	switch n := v.(type) {
	case int32:
		switch hint {
		case "int64":
			return int64(n)
		case "double":
			return float64(n)
		}
	case int64:
		switch hint {
		case "int32":
			if int64(int32(n)) == n {
				return int32(n)
			}
		case "double":
			return float64(n)
		}
	}

	return v
}

func (r *Repository) updateByID(ctx context.Context, containerID, itemID string, change bson.D) error {
	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return err
	}

	res, err := coll.UpdateOne(ctx, idFilter(itemID), change)
	if err != nil {
		return err
	}

	if res.MatchedCount == 0 {
		return contract.Invalid("document %q does not exist", itemID)
	}

	return nil
}
