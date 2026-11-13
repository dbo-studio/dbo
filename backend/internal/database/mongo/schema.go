package databaseMongo

import (
	"context"
	"sort"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	maxSample     = 5000
	maxSchemaDeep = 6   // nesting levels followed
	maxTopValues  = 5   // frequent values kept per field
	maxTracked    = 200 // distinct values tracked per field before new ones are ignored
	maxFields     = 500 // field paths kept; a sprawling schema is cut rather than sent whole
)

type fieldAcc struct {
	count  int
	types  map[string]int
	values map[string]int
}

// Analyze infers field types and frequent values from a random sample.
func (r *Repository) Analyze(ctx context.Context, containerID string, sample int) (*contract.SchemaAnalysis, error) {
	if sample <= 0 {
		sample = 1000
	}

	sample = min(sample, maxSample)

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	coll, err := r.collection(c, containerID)
	if err != nil {
		return nil, err
	}

	cur, err := coll.Aggregate(ctx, bson.A{bson.D{{Key: "$sample", Value: bson.D{{Key: "size", Value: sample}}}}})
	if err != nil {
		return nil, err
	}

	var docs []bson.D
	if err := cur.All(ctx, &docs); err != nil {
		return nil, err
	}

	acc := map[string]*fieldAcc{}

	for _, d := range docs {
		// A path counts once per document even when an array repeats it.
		seen := map[string]bool{}
		visit(acc, seen, "", d, 0)
	}

	out := &contract.SchemaAnalysis{Sampled: len(docs), Fields: make([]contract.SchemaField, 0, len(acc))}

	for path, a := range acc {
		f := contract.SchemaField{Path: path, Count: a.count}

		for t, n := range a.types {
			f.Types = append(f.Types, contract.SchemaType{Type: t, Count: n})
		}

		sort.Slice(f.Types, func(i, j int) bool {
			return f.Types[i].Count > f.Types[j].Count || f.Types[i].Count == f.Types[j].Count && f.Types[i].Type < f.Types[j].Type
		})

		for v, n := range a.values {
			f.Top = append(f.Top, contract.SchemaValue{Value: v, Count: n})
		}

		sort.Slice(f.Top, func(i, j int) bool {
			return f.Top[i].Count > f.Top[j].Count || f.Top[i].Count == f.Top[j].Count && f.Top[i].Value < f.Top[j].Value
		})

		if len(f.Top) > maxTopValues {
			f.Top = f.Top[:maxTopValues]
		}

		out.Fields = append(out.Fields, f)
	}

	sort.Slice(out.Fields, func(i, j int) bool { return out.Fields[i].Path < out.Fields[j].Path })

	if len(out.Fields) > maxFields {
		out.Fields = out.Fields[:maxFields]
	}

	return out, nil
}

func visit(acc map[string]*fieldAcc, seen map[string]bool, prefix string, d bson.D, depth int) {
	for _, e := range d {
		record(acc, seen, prefix+e.Key, e.Value, depth)
	}
}

func record(acc map[string]*fieldAcc, seen map[string]bool, path string, v any, depth int) {
	a := acc[path]
	if a == nil {
		if len(acc) >= maxFields*2 {
			return
		}

		a = &fieldAcc{types: map[string]int{}, values: map[string]int{}}
		acc[path] = a
	}

	if !seen[path] {
		seen[path] = true
		a.count++
	}

	a.types[bsonType(v)]++

	switch x := v.(type) {
	case bson.D:
		if depth < maxSchemaDeep {
			visit(acc, seen, path+".", x, depth+1)
		}
	case bson.A:
		for _, el := range x {
			// Array elements are summarized under the array's own path, and objects inside add their fields.
			if sub, ok := el.(bson.D); ok && depth < maxSchemaDeep {
				visit(acc, seen, path+".", sub, depth+1)
			}
		}
	default:
		text, _ := scalarText(v)
		if len(text) > 80 {
			text = text[:80] + "…"
		}

		if _, ok := a.values[text]; ok || len(a.values) < maxTracked {
			a.values[text]++
		}
	}
}

func (r *Repository) GetValidator(ctx context.Context, containerID string) (*contract.Validator, error) {
	db, name, err := splitContainer(containerID)
	if err != nil {
		return nil, err
	}

	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	var res struct {
		Cursor struct {
			FirstBatch []bson.D `bson:"firstBatch"`
		} `bson:"cursor"`
	}

	cmd := bson.D{{Key: "listCollections", Value: 1}, {Key: "filter", Value: bson.D{{Key: "name", Value: name}}}}
	if err := c.Database(db).RunCommand(ctx, cmd).Decode(&res); err != nil {
		return nil, err
	}

	out := &contract.Validator{Level: "strict", Action: "error"}

	if len(res.Cursor.FirstBatch) == 0 {
		return out, nil
	}

	opts, _ := get(res.Cursor.FirstBatch[0], "options").(bson.D)

	if v, ok := get(opts, "validator").(bson.D); ok && len(v) > 0 {
		out.Validator = extJSON(v)
	}

	if s, ok := get(opts, "validationLevel").(string); ok {
		out.Level = s
	}

	if s, ok := get(opts, "validationAction").(string); ok {
		out.Action = s
	}

	return out, nil
}

func (r *Repository) SetValidator(ctx context.Context, containerID string, v contract.Validator) error {
	db, name, err := splitContainer(containerID)
	if err != nil {
		return err
	}

	if v.Level != "off" && v.Level != "moderate" && v.Level != "strict" {
		return contract.Invalid("level must be off, moderate or strict")
	}

	if v.Action != "error" && v.Action != "warn" {
		return contract.Invalid("action must be error or warn")
	}

	rule, err := parseDoc(v.Validator)
	if err != nil {
		return err
	}

	// An empty rule clears the validator; collMod needs an explicit empty document for that.
	if strings.TrimSpace(v.Validator) == "" {
		rule = bson.D{}
	}

	c, err := r.client()
	if err != nil {
		return err
	}
	defer r.release(ctx, c)

	cmd := bson.D{{Key: "collMod", Value: name}, {Key: "validator", Value: rule}, {Key: "validationLevel", Value: v.Level}, {Key: "validationAction", Value: v.Action}}

	return c.Database(db).RunCommand(ctx, cmd).Err()
}
