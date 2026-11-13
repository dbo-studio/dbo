package databaseContract

import (
	"context"
	"fmt"
	"io"
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

// DocNode is one field of a document. Containers carry only a child count; their children load through DocTree.Children.
type DocNode struct {
	Key       string   `json:"key"`
	Path      []string `json:"path"`
	Type      string   `json:"type"`
	Value     string   `json:"value"` // relaxed Extended JSON for a scalar, empty for a container
	Count     int      `json:"count"` // children of an object or array
	Truncated bool     `json:"truncated"`
}

type DocChildren struct {
	Nodes []DocNode `json:"nodes"`
	Total int       `json:"total"`
}

// DocTree is an optional interface for document stores: it reads one level of a document at a time and edits one
// field at a time, so a large document is never sent or rewritten whole. Declared with CapDocTree.
type DocTree interface {
	// Children lists the fields of the object or array at path (empty path = the document), a window at a time.
	Children(ctx context.Context, containerID, itemID string, path []string, offset, limit int) (*DocChildren, error)
	// SetField writes value (Extended JSON) at path. typeHint keeps a number's width when it was edited.
	SetField(ctx context.Context, containerID, itemID string, path []string, value, typeHint string) error
	UnsetField(ctx context.Context, containerID, itemID string, path []string) error
}

// IndexDetail is one index with how often it was used since the server started (-1 = unknown).
type IndexDetail struct {
	Name    string `json:"name"`
	Keys    string `json:"keys"` // Extended JSON key document
	Unique  bool   `json:"unique"`
	Sparse  bool   `json:"sparse"`
	TTLSecs *int32 `json:"ttlSecs"`
	Partial string `json:"partial"` // partial filter expression, empty when none
	Ops     int64  `json:"ops"`
}

type IndexSpec struct {
	Keys    string `json:"keys"` // {"email":1}
	Name    string `json:"name"`
	Unique  bool   `json:"unique"`
	Sparse  bool   `json:"sparse"`
	TTLSecs *int32 `json:"ttlSecs"`
	Partial string `json:"partial"`
}

// ExplainResult summarizes a query plan. Raw is the full explain output as relaxed Extended JSON.
type ExplainResult struct {
	Stage        string `json:"stage"` // winning plan's root stage
	Index        string `json:"index"` // index the plan scans, empty for a collection scan
	Returned     int64  `json:"returned"`
	DocsExamined int64  `json:"docsExamined"`
	KeysExamined int64  `json:"keysExamined"`
	Millis       int64  `json:"millis"`
	Raw          string `json:"raw"`
}

// IndexManager is an optional interface for stores with secondary indexes. Declared with CapIndexes.
type IndexManager interface {
	Indexes(ctx context.Context, containerID string) ([]IndexDetail, error)
	CreateIndex(ctx context.Context, containerID string, spec IndexSpec) (string, error)
	DropIndex(ctx context.Context, containerID, name string) error
	Explain(ctx context.Context, containerID string, q BrowseQuery) (*ExplainResult, error)
}

// AggregateResult is a bounded preview of a pipeline's output; each doc is canonical Extended JSON.
type AggregateResult struct {
	Docs      []string `json:"docs"`
	Truncated bool     `json:"truncated"`
}

// Aggregator is an optional interface for stores with an aggregation pipeline. It is read-only: stages that
// write ($out, $merge) are refused. Declared with CapAggregate.
type Aggregator interface {
	Aggregate(ctx context.Context, containerID, pipeline string, limit int) (*AggregateResult, error)
}

// SchemaValue is one frequent value of a field.
type SchemaValue struct {
	Value string `json:"value"` // relaxed Extended JSON, cut short
	Count int    `json:"count"`
}

// SchemaType is how many sampled occurrences of a field had one type.
type SchemaType struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

// SchemaField describes one field path across a sample of documents. Count is how many documents had it.
type SchemaField struct {
	Path  string        `json:"path"`
	Count int           `json:"count"`
	Types []SchemaType  `json:"types"`
	Top   []SchemaValue `json:"top"`
}

type SchemaAnalysis struct {
	Sampled int           `json:"sampled"`
	Fields  []SchemaField `json:"fields"`
}

// Validator is a collection's document validation rule. Validator is Extended JSON, empty when none is set.
type Validator struct {
	Validator string `json:"validator"`
	Level     string `json:"level"`  // off | moderate | strict
	Action    string `json:"action"` // error | warn
}

// SchemaTools is an optional interface for document stores: it infers a schema from a sample and reads or writes
// the collection's validation rule. Declared with CapSchema.
type SchemaTools interface {
	Analyze(ctx context.Context, containerID string, sample int) (*SchemaAnalysis, error)
	GetValidator(ctx context.Context, containerID string) (*Validator, error)
	SetValidator(ctx context.Context, containerID string, v Validator) error
}

// ExportIter yields one document per call as a single line of canonical Extended JSON; ok is false at the end.
// Close must be called when the caller stops early.
type ExportIter interface {
	Next(ctx context.Context) (line string, ok bool, err error)
	Close(ctx context.Context)
}

// MaxImportBytes caps one import body, which is held in memory.
const MaxImportBytes = 64 << 20

// DataTransfer is an optional interface for moving whole collections in and out as NDJSON or a JSON array.
// Declared with CapTransfer.
type DataTransfer interface {
	// Export validates the filter up front, so a bad filter fails before any output is produced.
	Export(ctx context.Context, containerID, filter string) (ExportIter, error)
	// Import inserts the documents in order and stops at the first failure; inserted is what was written before it.
	Import(ctx context.Context, containerID, data, format string) (inserted int, err error)
	// ImportDocs inserts documents given as JSON text, in order, and stops at the first failure. It is what a background
	// import calls batch by batch.
	ImportDocs(ctx context.Context, containerID string, docs []string) (inserted int, err error)
}

// CollectionAdmin is an optional interface for collection-level structure changes. Declared with CapCollectionAdmin.
type CollectionAdmin interface {
	// RenameCollection returns the new container id.
	RenameCollection(ctx context.Context, containerID, newName string) (string, error)
	DropCollection(ctx context.Context, containerID string) error
}

// FieldDiff is one field a write would change in one document. Before and After are JSON text; empty means the field
// is absent on that side.
type FieldDiff struct {
	ID     string `json:"id"`
	Field  string `json:"field"`
	Before string `json:"before"`
	After  string `json:"after"`
}

// WritePreview is what a write statement would touch, read without changing anything.
type WritePreview struct {
	// Diff lists, field by field, what an update would change in the sampled documents, when it can be worked out.
	Diff     []FieldDiff `json:"diff,omitempty"`
	Affected int64       `json:"affected"`
	Capped   bool        `json:"capped"`         // Affected is a lower bound
	Sample   []string    `json:"sample"`         // a few of the documents or keys it touches, as text
	Note     string      `json:"note,omitempty"` // what the preview cannot say
}

// StatementCapture is what a write statement is about to change, read so it can be undone.
type StatementCapture struct {
	// Undo are statements that put back what the write changes. Empty when the write cannot be undone.
	Undo []string
	// Note says why Undo is empty or partial.
	Note string
	// After completes Undo from the statement's output, for writes that only know what they touched once they ran
	// (an insert learns its ids). It returns the full Undo.
	After func(output any) []string
}

// StatementWriter is an optional interface for drivers whose writes are statements (MongoDB shell, Redis commands):
// it previews and captures one write so the assistant can propose it for review and the user can undo it.
type StatementWriter interface {
	PreviewStatement(ctx context.Context, statement string) (*WritePreview, error)
	CaptureStatement(ctx context.Context, statement string) (*StatementCapture, error)
}

// ServerStatus is a summary of a MongoDB server: what serverStatus says, cut down to what an operator reads.
type ServerStatus struct {
	Host        string           `json:"host"`
	Version     string           `json:"version"`
	UptimeSecs  int64            `json:"uptimeSecs"`
	Connections map[string]int64 `json:"connections"` // current, available
	OpCounters  map[string]int64 `json:"opCounters"`
	MemoryMB    map[string]int64 `json:"memoryMb"` // resident, virtual
	Replica     string           `json:"replica"`  // replica set name, empty on a standalone server
}

// OperationInfo is one running operation (currentOp).
type OperationInfo struct {
	ID        string `json:"id"`
	Namespace string `json:"namespace"`
	Op        string `json:"op"`
	Client    string `json:"client"`
	Secs      int64  `json:"secs"`
	Active    bool   `json:"active"`
	Command   string `json:"command"` // cut short
}

type DatabaseInfo struct {
	Name        string `json:"name"`
	SizeOnDisk  int64  `json:"sizeOnDisk"`
	Collections int    `json:"collections"`
}

type CollectionInfo struct {
	Name   string `json:"name"`
	Type   string `json:"type"` // collection | view | timeseries
	Capped bool   `json:"capped"`
}

// CollectionOptions creates a collection of one of the special kinds. Kind is collection, capped, timeseries or view.
type CollectionOptions struct {
	Kind        string `json:"kind"`
	CappedBytes int64  `json:"cappedBytes"`
	TimeField   string `json:"timeField"`
	MetaField   string `json:"metaField"`
	Granularity string `json:"granularity"` // seconds | minutes | hours
	ViewOn      string `json:"viewOn"`
	Pipeline    string `json:"pipeline"` // a view's aggregation pipeline, a JSON array
}

type UserInfo struct {
	User  string   `json:"user"`
	DB    string   `json:"db"`
	Roles []string `json:"roles"` // role@db
}

type GridFSFile struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	Length      int64  `json:"length"`
	UploadDate  string `json:"uploadDate"`
	ContentType string `json:"contentType"`
}

// ChangeEvent is one change-stream event.
type ChangeEvent struct {
	Op  string `json:"op"`
	Key string `json:"key"`
	Doc string `json:"doc"` // the full document after the change, when the server sent it
	At  string `json:"at"`
}

// ServerTools is an optional interface for server-level views and structure: status, running operations, databases,
// special collections, users and GridFS, and a live change stream. Declared with ToolServer.
type ServerTools interface {
	Server(ctx context.Context) (*ServerStatus, error)
	Operations(ctx context.Context) ([]OperationInfo, error)
	KillOperation(ctx context.Context, id string) error
	Databases(ctx context.Context) ([]DatabaseInfo, error)
	CreateDatabase(ctx context.Context, name, firstCollection string) error
	DropDatabase(ctx context.Context, name string) error
	Collections(ctx context.Context, db string) ([]CollectionInfo, error)
	CreateCollectionWith(ctx context.Context, db, name string, opts CollectionOptions) error
	Users(ctx context.Context) ([]UserInfo, error)
	GridFSBuckets(ctx context.Context, db string) ([]string, error)
	GridFSFiles(ctx context.Context, db, bucket string, limit int) ([]GridFSFile, error)
	// GridFSOpen streams a file out; the caller closes the reader.
	GridFSOpen(ctx context.Context, db, bucket, id string) (io.ReadCloser, *GridFSFile, error)
	GridFSDelete(ctx context.Context, db, bucket, id string) error
	// WatchChanges blocks until ctx is done, calling emit for each change on the collection.
	WatchChanges(ctx context.Context, containerID string, emit func(ChangeEvent) error) error
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
	// CapDocTree means the driver implements DocTree.
	CapDocTree Capability = "doc-tree"
	// CapIndexes means the driver implements IndexManager.
	CapIndexes Capability = "indexes"
	// CapAggregate means the driver implements Aggregator.
	CapAggregate Capability = "aggregate"
	// CapSchema means the driver implements SchemaTools.
	CapSchema Capability = "schema"
	// CapTransfer means the driver implements DataTransfer.
	CapTransfer Capability = "transfer"
	// CapCollectionAdmin means the driver implements CollectionAdmin.
	CapCollectionAdmin Capability = "collection-admin"
)

type ToolID string

const (
	ToolPubSub ToolID = "pubsub"
	ToolCLI    ToolID = "cli"
	// ToolServer is the server view: status, operations, databases, users and GridFS (MongoDB).
	ToolServer ToolID = "server"
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
	// Projection is a raw document-store projection (Mongo: {"name":1}); empty returns whole documents.
	Projection string `json:"projection"`
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
