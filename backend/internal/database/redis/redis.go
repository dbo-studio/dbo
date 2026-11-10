// Package databaseRedis is the Redis (and Valkey/KeyDB/Dragonfly) NoSQLRepository.
// Containers are logical databases ("db0".."dbN"); items are keys.
package databaseRedis

import (
	"context"
	"crypto/tls"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/redis/go-redis/v9"
)

const (
	defaultDatabases = 16
	// DefaultDelimiter groups keys into a tree in the Browse UI.
	DefaultDelimiter = ":"
)

var (
	_ contract.NoSQLRepository = (*Repository)(nil)
	_ contract.PubSubProvider  = (*Repository)(nil)
	_ contract.CommandRunner   = (*Repository)(nil)
	_ contract.BulkDeleter     = (*Repository)(nil)
)

type clientKey struct {
	owner  string
	connID uint
	db     int
}

// clients holds one client per (owner, connection, db). A client is bound to its db for life,
// so SELECT is never issued on a pooled connection.
var (
	clientsMu sync.Mutex
	clients   = map[clientKey]*redis.Client{}
)

// Register wires client cleanup to the connection manager. Call once at startup.
func Register(cm *databaseConnection.ConnectionManager) {
	cm.OnClose(func(owner string, connID uint) {
		closeCLI(owner, connID)

		clientsMu.Lock()
		defer clientsMu.Unlock()

		for k, c := range clients {
			if k.owner == owner && k.connID == connID {
				_ = c.Close()

				delete(clients, k)
			}
		}
	})
}

type Repository struct {
	conn  *model.Connection
	owner string
	opts  dto.RedisConnectionParams
}

func New(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (*Repository, error) {
	// A not-yet-saved connection (ping) carries its password inline and has no stored secret.
	if connection.ID != 0 {
		if err := cm.HydratePassword(ctx, connection); err != nil {
			return nil, err
		}
	}

	opts, err := helper.RawJSONToStruct[dto.RedisConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil, fmt.Errorf("invalid redis options: %w", err)
	}

	return &Repository{conn: connection, owner: helper.CtxOwnerID(ctx), opts: opts}, nil
}

func (r *Repository) options(db int) *redis.Options {
	o := &redis.Options{
		Addr:     fmt.Sprintf("%s:%d", r.opts.Host, r.opts.Port),
		Username: r.opts.Username,
		Password: r.opts.Password,
		DB:       db,
	}
	if r.opts.TLS {
		o.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12, ServerName: r.opts.Host, InsecureSkipVerify: r.opts.TLSInsecure} //nolint:gosec // user opt-in
	}

	return o
}

// client returns the cached client for a db, creating it lazily. Unsaved connections (ping) are not cached.
func (r *Repository) client(db int) *redis.Client {
	if r.conn.ID == 0 {
		return redis.NewClient(r.options(db))
	}

	clientsMu.Lock()
	defer clientsMu.Unlock()

	k := clientKey{r.owner, r.conn.ID, db}
	if c, ok := clients[k]; ok {
		return c
	}

	c := redis.NewClient(r.options(db))
	clients[k] = c

	return c
}

// release closes clients that are not cached.
func (r *Repository) release(c *redis.Client) {
	if r.conn.ID == 0 {
		_ = c.Close()
	}
}

func dbIndex(containerID string) (int, error) {
	n, err := strconv.Atoi(strings.TrimPrefix(containerID, "db"))
	if err != nil || !strings.HasPrefix(containerID, "db") || n < 0 {
		return 0, fmt.Errorf("invalid container %q", containerID)
	}

	return n, nil
}

func (r *Repository) Version(ctx context.Context) (string, error) {
	c := r.client(int(r.opts.Database))
	defer r.release(c)

	info, err := c.Info(ctx, "server").Result()
	if err != nil {
		return "", err
	}

	for _, line := range strings.Split(info, "\n") {
		for _, key := range []string{"redis_version:", "valkey_version:", "dragonfly_version:"} {
			if v, ok := strings.CutPrefix(strings.TrimSpace(line), key); ok {
				return v, nil
			}
		}
	}

	return "unknown", nil
}

// databaseCount reads CONFIG GET databases, falling back to 16 when CONFIG is denied.
func databaseCount(ctx context.Context, c *redis.Client) int {
	res, err := c.ConfigGet(ctx, "databases").Result()
	if err != nil {
		return defaultDatabases
	}

	if n, err := strconv.Atoi(res["databases"]); err == nil && n > 0 {
		return n
	}

	return defaultDatabases
}

// keyCounts parses INFO keyspace ("db0:keys=3,expires=0,...").
func keyCounts(ctx context.Context, c *redis.Client) map[int]int64 {
	out := map[int]int64{}

	info, err := c.Info(ctx, "keyspace").Result()
	if err != nil {
		return out
	}

	for _, line := range strings.Split(info, "\n") {
		line = strings.TrimSpace(line)
		name, rest, ok := strings.Cut(line, ":")

		if !ok || !strings.HasPrefix(name, "db") {
			continue
		}

		idx, err := strconv.Atoi(strings.TrimPrefix(name, "db"))
		if err != nil {
			continue
		}

		for _, kv := range strings.Split(rest, ",") {
			if v, ok := strings.CutPrefix(kv, "keys="); ok {
				out[idx], _ = strconv.ParseInt(v, 10, 64)
			}
		}
	}

	return out
}

var refreshAction = contract.TreeNodeAction{Title: "Refresh", Name: contract.RefreshAction, Type: contract.TreeNodeActionTypeCommand}

// Tree lists the databases that hold keys, plus the default one. Browse shows every db when asked via parent "all".
func (r *Repository) Tree(ctx context.Context, parentID string) (*contract.TreeNode, error) {
	if parentID != "" && parentID != "all" {
		return nil, fmt.Errorf("unsupported parent_id: %s", parentID)
	}

	c := r.client(int(r.opts.Database))
	defer r.release(c)

	counts := keyCounts(ctx, c)
	total := databaseCount(ctx, c)

	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@redis", r.conn.ID),
		Name:        r.conn.Name,
		Type:        contract.DatabaseContainerNodeType,
		HasChildren: true,
		Children:    make([]contract.TreeNode, 0, total),
		ContextMenu: []contract.TreeNodeAction{
			refreshAction,
			{Title: "Pub/Sub", Name: contract.OpenToolAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "tool", "tool": string(contract.ToolPubSub)}},
			{Title: "CLI", Name: contract.OpenToolAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "tool", "tool": string(contract.ToolCLI)}},
		},
	}

	for i := range total {
		// Empty dbs stay hidden unless they are the default db or all are requested.
		if parentID != "all" && counts[i] == 0 && i != int(r.opts.Database) {
			continue
		}

		root.Children = append(root.Children, contract.TreeNode{
			ID:   fmt.Sprintf("db%d", i),
			Name: fmt.Sprintf("db%d", i),
			Type: contract.TableNodeType,
			Action: &contract.TreeNodeAction{
				Title: "Browse", Name: contract.BrowseContainerAction, Type: contract.TreeNodeActionTypeTab, Params: map[string]any{"path": "browse"},
			},
			ContextMenu: []contract.TreeNodeAction{refreshAction},
			Metadata:    map[string]any{"keys": counts[i]},
		})
	}

	return root, nil
}

func (r *Repository) Describe(_ context.Context, containerID string) (*contract.ContainerSpec, error) {
	if _, err := dbIndex(containerID); err != nil {
		return nil, err
	}

	return &contract.ContainerSpec{
		Filter:    contract.FilterPattern,
		ListStyle: contract.ListTree,
		Delimiter: DefaultDelimiter,
		Capabilities: []contract.Capability{
			contract.CapInsert, contract.CapEdit, contract.CapDelete, contract.CapBulkDelete, contract.CapBulkDeletePattern, contract.CapRecycle, contract.CapWindow, contract.CapTTL, contract.CapRename,
		},
		Tools: []contract.ToolID{contract.ToolPubSub, contract.ToolCLI},
		CreateKinds: []contract.CreateKind{
			{ID: "string", Label: "String", View: contract.ViewText},
			{ID: "hash", Label: "Hash", View: contract.ViewFields},
			{ID: "list", Label: "List", View: contract.ViewList},
			{ID: "set", Label: "Set", View: contract.ViewSet},
			{ID: "zset", Label: "Sorted set", View: contract.ViewSet},
		},
	}, nil
}
