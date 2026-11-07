package databaseContract

import (
	"context"
	"fmt"
	"slices"
)

// TreeRepository is the slice of a driver the connection tree needs. Both the SQL
// DatabaseRepository and NoSQLRepository satisfy it, so tree code serves either.
type TreeRepository interface {
	Version(ctx context.Context) (string, error)
	Tree(ctx context.Context, parentID string) (*TreeNode, error)
}

// NoSQLRepository is the single contract every NoSQL driver implements. It is
// generic over how data is shown (ContainerSpec/Item), not over a data model.
// A container is a redis db, a mongo collection, and so on.
type NoSQLRepository interface {
	TreeRepository

	Describe(ctx context.Context, containerID string) (*ContainerSpec, error)
	Browse(ctx context.Context, containerID string, q BrowseQuery) (*BrowsePage, error)
	Get(ctx context.Context, containerID, itemID string) (*Item, error)
	Save(ctx context.Context, containerID, itemID string, change ItemChange) error
	Insert(ctx context.Context, containerID string, item ItemInput) (string, error)
	Delete(ctx context.Context, containerID string, itemIDs []string) error

	// Classify lets the driver rate its own operations for Safe Mode.
	Classify(op Operation) SafetyClass
}

// PubSubProvider is an optional interface; drivers that support it declare ToolPubSub.
type PubSubProvider interface {
	Channels(ctx context.Context, pattern string) ([]string, error)
	// Subscribe blocks until ctx is done.
	Subscribe(ctx context.Context, channels []string, out chan<- Message) error
	Publish(ctx context.Context, channel, msg string) (int64, error)
}

// BulkDeleter is an optional interface for drivers that can delete every item matching a pattern
// in bounded batches. Declared with CapBulkDeletePattern.
type BulkDeleter interface {
	// CountMatching counts matches up to limit; capped is true when more may exist.
	CountMatching(ctx context.Context, containerID, pattern string, limit int) (n int, capped bool, err error)
	// DeleteMatching removes matches in batches, calling progress after each batch. It stops when ctx is done.
	DeleteMatching(ctx context.Context, containerID, pattern string, progress func(deleted int)) (int, error)
}

// Member is one entry of a collection item. Key is the hash field, set/zset member or list index; Value is
// the hash/list value; Score is only set for sorted sets.
type Member struct {
	Key   string   `json:"key"`
	Value string   `json:"value"`
	Score *float64 `json:"score,omitempty"`
}

type MemberWindow struct {
	Members    []Member `json:"members"`
	NextCursor string   `json:"nextCursor"` // empty on the last window
	Total      int64    `json:"total"`
}

type MemberOp struct {
	Op    string   `json:"op"` // set | remove | append
	Key   string   `json:"key"`
	Value string   `json:"value"`
	Score *float64 `json:"score"`
}

// Windower is an optional interface for drivers whose items hold large collections: it pages members and
// edits one member at a time, so a big key is never loaded or rewritten whole. Declared with CapWindow.
type Windower interface {
	Window(ctx context.Context, containerID, itemID, cursor string, limit int) (*MemberWindow, error)
	ApplyMember(ctx context.Context, containerID, itemID string, op MemberOp) error
}

// Recycler is an optional interface for drivers that can snapshot an item before it is deleted
// and bring it back. Declared with CapRecycle.
type Recycler interface {
	// Snapshot returns an opaque payload and the remaining TTL in ms (0 = none). ok is false when the item is gone.
	Snapshot(ctx context.Context, containerID, itemID string) (payload []byte, ttlMs int64, ok bool, err error)
	// Restore recreates the item; it fails when the id already exists.
	Restore(ctx context.Context, containerID, itemID string, payload []byte, ttlMs int64) error
}

// IndexInfo is one index of a collection-like container.
type IndexInfo struct {
	Name   string `json:"name"`
	Keys   string `json:"keys"`
	Unique bool   `json:"unique"`
}

// ContainerStats is what a driver knows about the size and indexes of one container.
type ContainerStats struct {
	Count       int64       `json:"count"`
	Size        int64       `json:"size"`
	AvgObjSize  int64       `json:"avgObjSize"`
	StorageSize int64       `json:"storageSize"`
	Indexes     []IndexInfo `json:"indexes"`
}

// StatsProvider is an optional interface for drivers that can report container size and indexes. Declared with CapStats.
type StatsProvider interface {
	Stats(ctx context.Context, containerID string) (*ContainerStats, error)
}

// CommandRunner is an optional interface; drivers that support it declare ToolCLI.
type CommandRunner interface {
	RunCommand(ctx context.Context, input string) (*CommandResult, error)
}

type FilterKind string

const (
	FilterPattern FilterKind = "pattern" // glob, e.g. redis SCAN MATCH
	FilterFields  FilterKind = "fields"  // structured field filters and sorts
	FilterQuery   FilterKind = "query"   // raw query editor
)

type ViewKind string

const (
	ViewText     ViewKind = "text"
	ViewDocument ViewKind = "document"
	ViewFields   ViewKind = "fields"
	ViewList     ViewKind = "list"
	ViewSet      ViewKind = "set"
	ViewTable    ViewKind = "table"
)

type ListStyle string

const (
	ListFlat ListStyle = "flat"
	ListTree ListStyle = "tree" // split item ids by ContainerSpec.Delimiter
)

type Capability string

const (
	CapInsert     Capability = "insert"
	CapEdit       Capability = "edit"
	CapDelete     Capability = "delete"
	CapBulkDelete Capability = "bulk-delete"
	CapTTL        Capability = "ttl"
	CapRename     Capability = "rename"
	// CapBulkDeletePattern means the driver implements BulkDeleter.
	CapBulkDeletePattern Capability = "bulk-delete-pattern"
	// CapRecycle means the driver implements Recycler.
	CapRecycle Capability = "recycle"
	// CapStats means the driver implements StatsProvider.
	CapStats Capability = "stats"
	// CapWindow means the driver implements Windower.
	CapWindow Capability = "window"
)

type ToolID string

const (
	ToolPubSub ToolID = "pubsub"
	ToolCLI    ToolID = "cli"
)

type SafetyClass string

const (
	SafetyRead        SafetyClass = "read"
	SafetyWrite       SafetyClass = "write"
	SafetyDestructive SafetyClass = "destructive"
	SafetyBlocked     SafetyClass = "blocked"
)

type Operation struct {
	Name        string `json:"name"` // browse, get, save, insert, delete, or a driver command
	ContainerID string `json:"containerId"`
	Count       int    `json:"count"` // items touched, for bulk operations
	Raw         string `json:"raw"`   // raw command or query text, when any
}

type FieldInfo struct {
	Name  string   `json:"name"`
	Types []string `json:"types"` // more than one for mixed-type fields
}

type ContainerSpec struct {
	Filter       FilterKind   `json:"filter"`
	Fields       []FieldInfo  `json:"fields"`
	ListStyle    ListStyle    `json:"listStyle"`
	Delimiter    string       `json:"delimiter"`
	Capabilities []Capability `json:"capabilities"`
	Tools        []ToolID     `json:"tools"`
	// CreateKinds lists what Insert can create (redis key types); empty means "same view as existing items".
	CreateKinds []CreateKind `json:"createKinds"`
}

// CreateKind is one creatable item type. ItemInput.Meta["kind"] carries ID on Insert.
type CreateKind struct {
	ID    string   `json:"id"`
	Label string   `json:"label"`
	View  ViewKind `json:"view"`
}

// MaxBrowseLimit caps every Browse page so no UI path is unbounded.
const MaxBrowseLimit = 500

type BrowseQuery struct {
	Cursor string       `json:"cursor"` // empty for the first page
	Limit  int          `json:"limit"`  // clamped to 1..MaxBrowseLimit by ClampLimit
	Filter string       `json:"filter"` // glob, raw query or generated query, per ContainerSpec.Filter
	Sorts  []BrowseSort `json:"sorts"`
	// Filters is the structured form of a FilterFields filter; Filter holds its generated text.
	Filters []BrowseFilter `json:"filters"`
}

type BrowseFilter struct {
	Field    string `json:"field"`
	Operator string `json:"operator"` // =, !=, <, >, IS NULL, IS NOT NULL, LIKE_CONTAINS, LIKE_STARTS, LIKE_ENDS
	Value    string `json:"value"`
	Next     string `json:"next"` // AND | OR, joining this filter to the following one
}

type BrowseSort struct {
	Field string `json:"field"`
	Desc  bool   `json:"desc"`
}

func (q BrowseQuery) ClampLimit(def int) int {
	switch {
	case q.Limit <= 0:
		return def
	case q.Limit > MaxBrowseLimit:
		return MaxBrowseLimit
	default:
		return q.Limit
	}
}

// BrowsePage is one cursor page. NextCursor is empty on the last page.
type BrowsePage struct {
	Items      []Item `json:"items"`
	NextCursor string `json:"nextCursor"`
}

// Item values cross the API binary-safe and type-preserving: non-UTF-8 bytes
// are sent base64 with Meta["encoding"]="base64"; documents use canonical Extended JSON.
type Item struct {
	ID    string         `json:"id"`
	View  ViewKind       `json:"view"`
	Value any            `json:"value"`
	Meta  map[string]any `json:"meta"`
}

type ItemInput struct {
	ID    string         `json:"id"`
	View  ViewKind       `json:"view"`
	Value any            `json:"value"`
	Meta  map[string]any `json:"meta"`
}

type ItemChange struct {
	Value   any            `json:"value"`
	Meta    map[string]any `json:"meta"`
	NewID   string         `json:"newId"`   // rename, needs CapRename
	TTLSecs *int64         `json:"ttlSecs"` // needs CapTTL
}

type Message struct {
	Channel string `json:"channel"`
	Payload string `json:"payload"`
}

type CommandResult struct {
	Output any `json:"output"`
}

func HasCapability(spec *ContainerSpec, c Capability) bool {
	return spec != nil && slices.Contains(spec.Capabilities, c)
}

// InvalidInput marks an error the caller caused (bad value, key exists, missing key). The service answers it
// with 400; any other driver error is a 500.
type InvalidInput struct{ Msg string }

func (e InvalidInput) Error() string { return e.Msg }

// Invalid builds an InvalidInput.
func Invalid(format string, a ...any) error { return InvalidInput{Msg: fmt.Sprintf(format, a...)} }
