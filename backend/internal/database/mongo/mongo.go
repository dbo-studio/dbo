// Package databaseMongo is the MongoDB NoSQLRepository. Containers are "database/collection"; items are documents.
// Documents cross the API as canonical Extended JSON, so ObjectId, dates and number types survive a save.
package databaseMongo

import (
	"context"
	"crypto/tls"
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const (
	defaultPort     = 27017
	connectTimeout  = 8 * time.Second
	defaultDatabase = "test"
)

var (
	_ contract.NoSQLRepository = (*Repository)(nil)
	_ contract.BulkDeleter     = (*Repository)(nil)
	_ contract.Recycler        = (*Repository)(nil)
	_ contract.CommandRunner   = (*Repository)(nil)
	_ contract.StatsProvider   = (*Repository)(nil)
	_ contract.DocTree         = (*Repository)(nil)
	_ contract.IndexManager    = (*Repository)(nil)
	_ contract.Aggregator      = (*Repository)(nil)
	_ contract.SchemaTools     = (*Repository)(nil)
	_ contract.DataTransfer    = (*Repository)(nil)
	_ contract.CollectionAdmin = (*Repository)(nil)
)

type clientKey struct {
	owner  string
	connID uint
}

// clients holds one client (with its own pool) per (owner, connection).
var (
	clientsMu sync.Mutex
	clients   = map[clientKey]*mongo.Client{}
)

// Register wires client cleanup to the connection manager. Call once at startup.
func Register(cm *databaseConnection.ConnectionManager) {
	cm.OnClose(func(owner string, connID uint) {
		clientsMu.Lock()
		defer clientsMu.Unlock()

		k := clientKey{owner, connID}
		if c, ok := clients[k]; ok {
			_ = c.Disconnect(context.Background())

			delete(clients, k)
		}

		forgetCLI(owner, connID)
	})
}

type Repository struct {
	conn  *model.Connection
	owner string
	opts  dto.MongoConnectionParams
}

func New(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (*Repository, error) {
	// A not-yet-saved connection (ping) carries its password inline and has no stored secret.
	if connection.ID != 0 {
		if err := cm.HydratePassword(ctx, connection); err != nil {
			return nil, err
		}
	}

	opts, err := helper.RawJSONToStruct[dto.MongoConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil, fmt.Errorf("invalid mongodb options: %w", err)
	}

	if opts.URI != "" {
		opts.URI = databaseConnection.InjectURIPassword(opts.URI, opts.Password)
	}

	return &Repository{conn: connection, owner: helper.CtxOwnerID(ctx), opts: opts}, nil
}

func (r *Repository) clientOptions() *options.ClientOptions {
	o := options.Client().SetServerSelectionTimeout(connectTimeout).SetConnectTimeout(connectTimeout).SetAppName("dbo")

	if r.opts.URI != "" {
		o.ApplyURI(r.opts.URI)
	} else {
		port := r.opts.Port
		if port == 0 {
			port = defaultPort
		}

		o.ApplyURI(fmt.Sprintf("mongodb://%s:%d", r.opts.Host, port))

		if r.opts.Username != "" {
			o.SetAuth(options.Credential{Username: r.opts.Username, Password: r.opts.Password, AuthSource: orDefault(r.opts.AuthSource, "admin")})
		}
	}

	if r.opts.TLS {
		o.SetTLSConfig(&tls.Config{MinVersion: tls.VersionTLS12, InsecureSkipVerify: r.opts.TLSInsecure}) //nolint:gosec // user opt-in
	}

	return o
}

func orDefault(s, d string) string {
	if s == "" {
		return d
	}

	return s
}

// client returns the cached client, creating it lazily. Unsaved connections (ping) get a throwaway client.
func (r *Repository) client() (*mongo.Client, error) {
	if r.conn.ID == 0 {
		return mongo.Connect(r.clientOptions())
	}

	clientsMu.Lock()
	defer clientsMu.Unlock()

	k := clientKey{r.owner, r.conn.ID}
	if c, ok := clients[k]; ok {
		return c, nil
	}

	c, err := mongo.Connect(r.clientOptions())
	if err != nil {
		return nil, err
	}

	clients[k] = c

	return c, nil
}

// release closes clients that are not cached.
func (r *Repository) release(ctx context.Context, c *mongo.Client) {
	if r.conn.ID == 0 {
		_ = c.Disconnect(context.WithoutCancel(ctx))
	}
}

// defaultDB is the database the terminal starts in: the form field, else the URI path, else "test".
func (r *Repository) defaultDB() string {
	if r.opts.Database != "" {
		return r.opts.Database
	}

	if r.opts.URI != "" {
		rest := r.opts.URI[strings.Index(r.opts.URI, "://")+3:]
		if _, path, ok := strings.Cut(rest, "/"); ok {
			if name, _, _ := strings.Cut(path, "?"); name != "" {
				return name
			}
		}
	}

	return defaultDatabase
}

// splitContainer turns "db/collection" into its parts; a collection name may contain "/", a database name cannot.
func splitContainer(containerID string) (db, coll string, err error) {
	db, coll, ok := strings.Cut(containerID, "/")
	if !ok || db == "" || coll == "" {
		return "", "", contract.Invalid("invalid container %q", containerID)
	}

	return db, coll, nil
}

func (r *Repository) collection(c *mongo.Client, containerID string) (*mongo.Collection, error) {
	db, coll, err := splitContainer(containerID)
	if err != nil {
		return nil, err
	}

	return c.Database(db).Collection(coll), nil
}

func (r *Repository) Version(ctx context.Context) (string, error) {
	c, err := r.client()
	if err != nil {
		return "", err
	}
	defer r.release(ctx, c)

	var info struct {
		Version string `bson:"version"`
	}

	if err := c.Database("admin").RunCommand(ctx, bson.D{{Key: "buildInfo", Value: 1}}).Decode(&info); err != nil {
		return "", err
	}

	return info.Version, nil
}

var (
	refreshAction = contract.TreeNodeAction{Title: "Refresh", Name: contract.RefreshAction, Type: contract.TreeNodeActionTypeCommand}
	systemDBs     = []string{"admin", "local", "config"}
)

// Tree lists databases at the root and a database's collections when it is expanded.
func (r *Repository) Tree(ctx context.Context, parentID string) (*contract.TreeNode, error) {
	c, err := r.client()
	if err != nil {
		return nil, err
	}
	defer r.release(ctx, c)

	if parentID != "" {
		return r.collectionsNode(ctx, c, parentID)
	}

	names, err := c.ListDatabaseNames(ctx, bson.D{})
	if err != nil {
		return nil, err
	}

	// The default database is offered even before its first collection exists.
	if def := r.defaultDB(); !slices.Contains(names, def) {
		names = append(names, def)
	}

	slices.Sort(names)

	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@mongodb", r.conn.ID),
		Name:        r.conn.Name,
		Type:        contract.DatabaseContainerNodeType,
		HasChildren: true,
		Children:    make([]contract.TreeNode, 0, len(names)),
		ContextMenu: []contract.TreeNodeAction{
			refreshAction,
			{Title: "CLI", Name: contract.OpenToolAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "tool", "tool": string(contract.ToolCLI)}},
			{Title: "Server", Name: contract.OpenToolAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "tool", "tool": string(contract.ToolServer)}},
		},
	}

	for _, name := range names {
		if slices.Contains(systemDBs, name) {
			continue
		}

		root.Children = append(root.Children, contract.TreeNode{
			ID: name, Name: name, Type: contract.DatabaseNodeType, HasChildren: true,
			Children: []contract.TreeNode{}, ContextMenu: databaseMenu(name),
		})
	}

	return root, nil
}

func (r *Repository) collectionsNode(ctx context.Context, c *mongo.Client, db string) (*contract.TreeNode, error) {
	names, err := c.Database(db).ListCollectionNames(ctx, bson.D{})
	if err != nil {
		return nil, err
	}

	slices.Sort(names)

	node := &contract.TreeNode{
		ID: db, Name: db, Type: contract.DatabaseNodeType, HasChildren: true,
		Children: make([]contract.TreeNode, 0, len(names)), ContextMenu: databaseMenu(db),
	}

	for _, name := range names {
		if strings.HasPrefix(name, "system.") {
			continue
		}

		node.Children = append(node.Children, contract.TreeNode{
			ID: db + "/" + name, Name: name, Type: contract.TableNodeType,
			Action: &contract.TreeNodeAction{
				Title: "Browse", Name: contract.BrowseContainerAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "browse"},
			},
			ContextMenu: collectionMenu(db, name),
		})
	}

	return node, nil
}

var plainName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// collRef is how the shell addresses a collection: db.users, or db.getCollection("a.b") when the name needs it.
func collRef(name string) string {
	if plainName.MatchString(name) {
		return "db." + name
	}

	return "db.getCollection(" + strconv.Quote(name) + ")"
}

// openQuery opens the editor with a statement. Scripts name their database first, because the shell runs in
// the one last selected. run is false for templates the user must finish.
func openQuery(title, db, statement string, run bool) contract.TreeNodeAction {
	return contract.TreeNodeAction{
		Title: title, Name: contract.OpenQueryAction, Type: contract.TreeNodeActionTypeTab,
		Params: map[string]any{"path": "query", "query": "use " + db + ";\n" + statement, "run": run},
	}
}

func databaseMenu(db string) []contract.TreeNodeAction {
	return []contract.TreeNodeAction{
		openQuery("Create collection", db, `db.createCollection("new_collection")`, false),
		refreshAction,
	}
}

func collectionMenu(db, coll string) []contract.TreeNodeAction {
	ref := collRef(coll)

	return []contract.TreeNodeAction{
		openQuery("Indexes", db, ref+".getIndexes()", true),
		openQuery("Create index", db, ref+`.createIndex({ field: 1 }, { name: "field_1" })`, false),
		openQuery("Drop collection", db, ref+".drop()", false),
		refreshAction,
	}
}

// sampleSize is how many documents Describe reads to learn a collection's field names.
const sampleSize = 50

// sampleFields lists the top-level fields of a sample of the collection with the value types seen for each.
func (r *Repository) sampleFields(ctx context.Context, db, coll string) []contract.FieldInfo {
	c, err := r.client()
	if err != nil {
		return nil
	}
	defer r.release(ctx, c)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	cur, err := c.Database(db).Collection(coll).Aggregate(ctx, bson.A{bson.D{{Key: "$sample", Value: bson.D{{Key: "size", Value: sampleSize}}}}})
	if err != nil {
		return nil
	}

	var docs []bson.D
	if err := cur.All(ctx, &docs); err != nil {
		return nil
	}

	order := []string{}
	types := map[string][]string{}

	for _, doc := range docs {
		for _, e := range doc {
			if _, seen := types[e.Key]; !seen {
				order = append(order, e.Key)
			}

			if t := valueType(e.Value); !slices.Contains(types[e.Key], t) {
				types[e.Key] = append(types[e.Key], t)
			}
		}
	}

	slices.Sort(order)

	fields := make([]contract.FieldInfo, 0, len(order))
	for _, name := range order {
		fields = append(fields, contract.FieldInfo{Name: name, Types: types[name]})
	}

	return fields
}

func valueType(v any) string {
	switch v.(type) {
	case nil:
		return "null"
	case string:
		return "string"
	case int32, int64:
		return "int"
	case float64:
		return "double"
	case bool:
		return "bool"
	case bson.ObjectID:
		return "objectId"
	case bson.DateTime, time.Time:
		return "date"
	case bson.A:
		return "array"
	case bson.D, bson.M:
		return "object"
	default:
		return "other"
	}
}

func (r *Repository) Describe(ctx context.Context, containerID string) (*contract.ContainerSpec, error) {
	db, coll, err := splitContainer(containerID)
	if err != nil {
		return nil, err
	}

	return &contract.ContainerSpec{
		Fields:    r.sampleFields(ctx, db, coll),
		Filter:    contract.FilterQuery,
		ListStyle: contract.ListFlat,
		Capabilities: []contract.Capability{
			contract.CapInsert, contract.CapEdit, contract.CapDelete, contract.CapBulkDelete, contract.CapBulkDeletePattern, contract.CapRecycle, contract.CapStats, contract.CapDocTree, contract.CapIndexes, contract.CapAggregate, contract.CapSchema, contract.CapTransfer, contract.CapCollectionAdmin,
		},
		Tools:       []contract.ToolID{contract.ToolCLI, contract.ToolServer},
		CreateKinds: []contract.CreateKind{{ID: "document", Label: "Document", View: contract.ViewDocument}},
	}, nil
}
