package databaseMongo

import (
	"encoding/json"
	"sort"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// relaxed turns a document into plain nested maps (numbers as float64, ids and dates as Extended JSON objects), the
// form the preview works in. It is for display, so exact BSON types do not matter here.
func relaxed(v any) (map[string]any, error) {
	b, err := bson.MarshalExtJSON(v, false, false)
	if err != nil {
		return nil, err
	}

	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}

	return m, nil
}

// diffDocs says, field by field, what an update or replace would change in the given documents. A note says when
// the update uses something the preview does not simulate.
func diffDocs(method string, docs []bson.D, args []string) ([]contract.FieldDiff, string) {
	if len(args) < 2 {
		return nil, ""
	}

	change, err := parseDoc(args[1])
	if err != nil || len(change) == 0 {
		return nil, ""
	}

	update, err := relaxed(change)
	if err != nil {
		return nil, ""
	}

	replace := method == "replaceOne" || method == "findOneAndReplace"
	out := []contract.FieldDiff{}

	for _, d := range docs {
		before, err := relaxed(d)
		if err != nil {
			continue
		}

		after, ok := simulate(before, update, replace)
		if !ok {
			return nil, "the field-level change is shown for $set, $unset, $inc, $mul and $rename; this update uses another operator"
		}

		id, _ := json.Marshal(before["_id"])
		out = append(out, changedFields(string(id), flat(before), flat(after))...)
	}

	return out, ""
}

// simulate applies an update document (or a replacement) to a copy of doc. ok is false for an operator it does not know.
func simulate(doc, update map[string]any, replace bool) (map[string]any, bool) {
	if replace {
		out := map[string]any{}
		for k, v := range update {
			out[k] = v
		}

		out["_id"] = doc["_id"]

		return out, true
	}

	out := deepCopy(doc)

	for op, raw := range update {
		fields, _ := raw.(map[string]any)

		for path, val := range fields {
			switch op {
			case "$set":
				setPath(out, path, val)
			case "$unset":
				unsetPath(out, path)
			case "$inc", "$mul":
				cur, _ := getPath(out, path)
				a, _ := cur.(float64)
				b, _ := val.(float64)

				if op == "$inc" {
					setPath(out, path, a+b)
				} else {
					setPath(out, path, a*b)
				}
			case "$rename":
				to, _ := val.(string)
				if cur, ok := getPath(out, path); ok && to != "" {
					unsetPath(out, path)
					setPath(out, to, cur)
				}
			case "$setOnInsert":
			default:
				return nil, false
			}
		}
	}

	return out, true
}

func deepCopy(m map[string]any) map[string]any {
	b, _ := json.Marshal(m)

	var out map[string]any
	_ = json.Unmarshal(b, &out)

	return out
}

func getPath(m map[string]any, path string) (any, bool) {
	var cur any = m

	for _, seg := range strings.Split(path, ".") {
		node, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}

		if cur, ok = node[seg]; !ok {
			return nil, false
		}
	}

	return cur, true
}

func setPath(m map[string]any, path string, v any) {
	segs := strings.Split(path, ".")
	cur := m

	for _, seg := range segs[:len(segs)-1] {
		next, ok := cur[seg].(map[string]any)
		if !ok {
			next = map[string]any{}
			cur[seg] = next
		}

		cur = next
	}

	cur[segs[len(segs)-1]] = v
}

func unsetPath(m map[string]any, path string) {
	segs := strings.Split(path, ".")
	cur := m

	for _, seg := range segs[:len(segs)-1] {
		next, ok := cur[seg].(map[string]any)
		if !ok {
			return
		}

		cur = next
	}

	delete(cur, segs[len(segs)-1])
}

// flat joins nested documents into dotted paths with JSON text values; arrays and Extended JSON values stay whole.
func flat(m map[string]any) map[string]string {
	out := map[string]string{}

	var walk func(prefix string, v any)

	walk = func(prefix string, v any) {
		if node, ok := v.(map[string]any); ok && !isExtended(node) {
			for k, child := range node {
				walk(prefix+"."+k, child)
			}

			return
		}

		b, _ := json.Marshal(v)
		out[prefix] = string(b)
	}

	for k, v := range m {
		walk(k, v)
	}

	return out
}

func isExtended(m map[string]any) bool {
	for k := range m {
		if strings.HasPrefix(k, "$") {
			return true
		}
	}

	return false
}

// changedFields lists the paths whose value differs, in a stable order.
func changedFields(id string, before, after map[string]string) []contract.FieldDiff {
	paths := map[string]bool{}
	for p := range before {
		paths[p] = true
	}

	for p := range after {
		paths[p] = true
	}

	names := make([]string, 0, len(paths))
	for p := range paths {
		names = append(names, p)
	}

	sort.Strings(names)

	var out []contract.FieldDiff

	for _, p := range names {
		if before[p] != after[p] {
			out = append(out, contract.FieldDiff{ID: strings.Trim(id, `"`), Field: p, Before: before[p], After: after[p]})
		}
	}

	return out
}
