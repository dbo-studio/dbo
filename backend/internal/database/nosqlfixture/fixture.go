// Package databaseNoSQLFixture is a test-only in-memory NoSQLRepository. It has one
// container per view primitive, every filter kind, and one streaming tool, so
// the Browse UI and the contract can be exercised without a real database.
package databaseNoSQLFixture

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

var ErrNotFound = errors.New("item not found")

type container struct {
	spec  contract.ContainerSpec
	items map[string]*contract.Item
}

type Repository struct {
	mu         sync.RWMutex
	containers map[string]*container
	order      []string
}

var (
	_ contract.NoSQLRepository = (*Repository)(nil)
	_ contract.PubSubProvider  = (*Repository)(nil)
)

func New() *Repository {
	r := &Repository{containers: map[string]*container{}}
	caps := []contract.Capability{contract.CapInsert, contract.CapEdit, contract.CapDelete, contract.CapBulkDelete}

	r.add("keys", contract.ContainerSpec{
		Filter: contract.FilterPattern, ListStyle: contract.ListTree, Delimiter: ":",
		Capabilities: append([]contract.Capability{contract.CapTTL, contract.CapRename}, caps...),
		Tools:        []contract.ToolID{contract.ToolPubSub},
	}, textItems())
	r.add("documents", contract.ContainerSpec{
		Filter: contract.FilterFields, ListStyle: contract.ListFlat,
		Fields: []contract.FieldInfo{
			{Name: "_id", Types: []string{"objectId"}},
			{Name: "name", Types: []string{"string"}},
			{Name: "age", Types: []string{"string", "int"}},
		},
		Capabilities: caps,
	}, documentItems())
	r.add("query", contract.ContainerSpec{
		Filter: contract.FilterQuery, ListStyle: contract.ListFlat,
		Fields:       []contract.FieldInfo{{Name: "name", Types: []string{"string"}}},
		Capabilities: []contract.Capability{contract.CapEdit},
	}, documentItems())
	r.add("hashes", contract.ContainerSpec{Filter: contract.FilterPattern, ListStyle: contract.ListFlat, Capabilities: caps},
		viewItems(contract.ViewFields, map[string]any{"a": "1", "b": "2"}))
	r.add("lists", contract.ContainerSpec{Filter: contract.FilterPattern, ListStyle: contract.ListFlat, Capabilities: caps},
		viewItems(contract.ViewList, []any{"x", "y", "z"}))
	r.add("sets", contract.ContainerSpec{Filter: contract.FilterPattern, ListStyle: contract.ListFlat, Capabilities: []contract.Capability{contract.CapEdit}},
		viewItems(contract.ViewSet, []any{"m1", "m2"}))
	r.add("tables", contract.ContainerSpec{
		Filter: contract.FilterFields, ListStyle: contract.ListFlat,
		Fields: []contract.FieldInfo{{Name: "id", Types: []string{"int"}}},
	}, viewItems(contract.ViewTable, []any{map[string]any{"id": 1}}))

	return r
}

func textItems() []*contract.Item {
	items := []*contract.Item{
		{ID: "user:1:name", View: contract.ViewText, Value: "alice"},
		{ID: "user:2:name", View: contract.ViewText, Value: "bob"},
		// Lossless binary: invalid UTF-8 travels as base64 with a flag.
		{ID: "bin:blob", View: contract.ViewText, Value: base64.StdEncoding.EncodeToString([]byte{0xff, 0x00, 0xfe}), Meta: map[string]any{"encoding": "base64"}},
	}
	for i := range 250 {
		items = append(items, &contract.Item{ID: fmt.Sprintf("page:%04d", i), View: contract.ViewText, Value: "v" + strconv.Itoa(i)})
	}

	return items
}

func documentItems() []*contract.Item {
	return []*contract.Item{
		{ID: "64b7f0000000000000000001", View: contract.ViewDocument, Value: `{"_id":{"$oid":"64b7f0000000000000000001"},"name":"alice","age":{"$numberInt":"30"},"at":{"$date":{"$numberLong":"1700000000000"}}}`},
		{ID: "64b7f0000000000000000002", View: contract.ViewDocument, Value: `{"_id":{"$oid":"64b7f0000000000000000002"},"name":"bob","age":"unknown"}`},
	}
}

func viewItems(v contract.ViewKind, value any) []*contract.Item {
	return []*contract.Item{{ID: "item:1", View: v, Value: value}}
}

func (r *Repository) add(id string, spec contract.ContainerSpec, items []*contract.Item) {
	c := &container{spec: spec, items: map[string]*contract.Item{}}
	for _, it := range items {
		c.items[it.ID] = it
	}

	r.containers[id] = c
	r.order = append(r.order, id)
}

func (r *Repository) Version(context.Context) (string, error) { return "fixture-1", nil }

func (r *Repository) Tree(_ context.Context, parentID string) (*contract.TreeNode, error) {
	if parentID != "" {
		return nil, fmt.Errorf("unsupported parent_id: %s", parentID)
	}

	root := &contract.TreeNode{ID: "fixture@root", Name: "Fixture", Type: contract.DatabaseContainerNodeType, HasChildren: true}
	for _, id := range r.order {
		root.Children = append(root.Children, contract.TreeNode{
			ID: id, Name: id, Type: contract.TableNodeType,
			Action: &contract.TreeNodeAction{Title: "Browse", Name: contract.BrowseContainerAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "browse"}},
		})
	}

	return root, nil
}

func (r *Repository) container(id string) (*container, error) {
	c, ok := r.containers[id]
	if !ok {
		return nil, fmt.Errorf("container %q: %w", id, ErrNotFound)
	}

	return c, nil
}

func (r *Repository) Describe(_ context.Context, containerID string) (*contract.ContainerSpec, error) {
	c, err := r.container(containerID)
	if err != nil {
		return nil, err
	}

	spec := c.spec

	return &spec, nil
}

// Browse pages by sorted item id; the cursor is the last id returned.
func (r *Repository) Browse(_ context.Context, containerID string, q contract.BrowseQuery) (*contract.BrowsePage, error) {
	c, err := r.container(containerID)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	ids := make([]string, 0, len(c.items))
	for id, it := range c.items {
		if matches(c.spec.Filter, q, id, it) {
			ids = append(ids, id)
		}
	}

	sort.Strings(ids)

	limit := q.ClampLimit(100)
	page := &contract.BrowsePage{Items: []contract.Item{}}

	for _, id := range ids {
		if q.Cursor != "" && id <= q.Cursor {
			continue
		}

		if len(page.Items) == limit {
			page.NextCursor = page.Items[len(page.Items)-1].ID
			break
		}

		page.Items = append(page.Items, *c.items[id])
	}

	return page, nil
}

// matches: pattern filters glob-match the id; fields/query filters are a substring of the value.
func matches(kind contract.FilterKind, q contract.BrowseQuery, id string, it *contract.Item) bool {
	if kind == contract.FilterFields && len(q.Filters) > 0 {
		return matchFields(q.Filters, it)
	}

	if q.Filter == "" {
		return true
	}

	if kind == contract.FilterPattern {
		return globMatch(q.Filter, id)
	}

	return strings.Contains(fmt.Sprint(it.Value), q.Filter)
}

// matchFields evaluates structured filters left to right against a JSON document value.
func matchFields(filters []contract.BrowseFilter, it *contract.Item) bool {
	var doc map[string]any
	if s, ok := it.Value.(string); ok {
		_ = json.Unmarshal([]byte(s), &doc)
	}

	var result bool

	for i, f := range filters {
		got := fieldString(doc[f.Field])
		ok := false

		switch f.Operator {
		case "=":
			ok = got == f.Value
		case "!=":
			ok = got != f.Value
		case "IS NULL":
			ok = doc[f.Field] == nil
		case "IS NOT NULL":
			ok = doc[f.Field] != nil
		case "LIKE_CONTAINS":
			ok = strings.Contains(got, f.Value)
		case "LIKE_STARTS":
			ok = strings.HasPrefix(got, f.Value)
		case "LIKE_ENDS":
			ok = strings.HasSuffix(got, f.Value)
		}

		switch {
		case i == 0:
			result = ok
		case filters[i-1].Next == "OR":
			result = result || ok
		default:
			result = result && ok
		}
	}

	return result
}

// fieldString unwraps Extended JSON scalars ({"$numberInt":"30"}, {"$oid":"..."}) to their text.
func fieldString(v any) string {
	if m, ok := v.(map[string]any); ok && len(m) == 1 {
		for _, inner := range m {
			return fmt.Sprint(inner)
		}
	}

	if v == nil {
		return ""
	}

	return fmt.Sprint(v)
}

func globMatch(pattern, s string) bool {
	parts := strings.Split(pattern, "*")
	if len(parts) == 1 {
		return pattern == s
	}

	if !strings.HasPrefix(s, parts[0]) {
		return false
	}

	s = s[len(parts[0]):]
	for _, p := range parts[1 : len(parts)-1] {
		i := strings.Index(s, p)
		if i < 0 {
			return false
		}

		s = s[i+len(p):]
	}

	return strings.HasSuffix(s, parts[len(parts)-1])
}

func (r *Repository) Get(_ context.Context, containerID, itemID string) (*contract.Item, error) {
	c, err := r.container(containerID)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	it, ok := c.items[itemID]
	if !ok {
		return nil, fmt.Errorf("item %q: %w", itemID, ErrNotFound)
	}

	cp := *it

	return &cp, nil
}

func (r *Repository) Save(_ context.Context, containerID, itemID string, change contract.ItemChange) error {
	c, err := r.container(containerID)
	if err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	it, ok := c.items[itemID]
	if !ok {
		return fmt.Errorf("item %q: %w", itemID, ErrNotFound)
	}

	if change.NewID != "" && change.NewID != itemID {
		if _, exists := c.items[change.NewID]; exists {
			return fmt.Errorf("item %q already exists", change.NewID)
		}
	}

	if change.Value != nil {
		it.Value = change.Value
	}

	if change.Meta != nil {
		it.Meta = change.Meta
	}

	if change.TTLSecs != nil {
		meta := map[string]any{}
		for k, v := range it.Meta {
			meta[k] = v
		}

		meta["ttl"] = *change.TTLSecs
		it.Meta = meta
	}

	if change.NewID != "" && change.NewID != itemID {
		delete(c.items, itemID)

		it.ID = change.NewID
		c.items[it.ID] = it
	}

	return nil
}

func (r *Repository) Insert(_ context.Context, containerID string, in contract.ItemInput) (string, error) {
	c, err := r.container(containerID)
	if err != nil {
		return "", err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if in.ID == "" {
		in.ID = "new:" + strconv.FormatInt(time.Now().UnixNano(), 36)
	}

	if _, exists := c.items[in.ID]; exists {
		return "", fmt.Errorf("item %q already exists", in.ID)
	}

	c.items[in.ID] = &contract.Item{ID: in.ID, View: in.View, Value: in.Value, Meta: in.Meta}

	return in.ID, nil
}

func (r *Repository) Delete(_ context.Context, containerID string, itemIDs []string) error {
	c, err := r.container(containerID)
	if err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	for _, id := range itemIDs {
		delete(c.items, id)
	}

	return nil
}

func (r *Repository) Classify(op contract.Operation) contract.SafetyClass {
	switch op.Name {
	case "browse", "get":
		return contract.SafetyRead
	case "save", "insert":
		return contract.SafetyWrite
	case "delete":
		if op.Count > 1 {
			return contract.SafetyDestructive
		}

		return contract.SafetyWrite
	default:
		return contract.SafetyBlocked
	}
}

func (r *Repository) Channels(context.Context, string) ([]string, error) {
	return []string{"fixture"}, nil
}

// Subscribe emits a tick every 100ms until ctx is done.
func (r *Repository) Subscribe(ctx context.Context, channels []string, out chan<- contract.Message) error {
	if len(channels) == 0 {
		return errors.New("at least one channel is required")
	}

	t := time.NewTicker(100 * time.Millisecond)
	defer t.Stop()

	for n := 0; ; n++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			select {
			case out <- contract.Message{Channel: channels[0], Payload: "tick " + strconv.Itoa(n)}:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

func (r *Repository) Publish(context.Context, string, string) (int64, error) { return 0, nil }
