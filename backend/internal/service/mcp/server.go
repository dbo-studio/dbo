package serviceMCP

import (
	"context"
	"net/http"

	"github.com/dbo-studio/dbo/internal/repository"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/dbo-studio/dbo/pkg/helper"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type NativeServer struct {
	registry      *serviceDbtools.Registry
	settingsRepo  repository.IMcpSettingsRepo
	mcpServer     *sdkmcp.Server
	streamHandler http.Handler
}

func NewNativeServer(registry *serviceDbtools.Registry, settingsRepo repository.IMcpSettingsRepo) *NativeServer {
	ns := &NativeServer{registry: registry, settingsRepo: settingsRepo}
	ns.mcpServer = sdkmcp.NewServer(&sdkmcp.Implementation{Name: "dbo", Version: "1.2.0"}, nil)
	ns.registerTools()
	ns.streamHandler = sdkmcp.NewStreamableHTTPHandler(func(_ *http.Request) *sdkmcp.Server {
		return ns.mcpServer
	}, nil)

	return ns
}

func (ns *NativeServer) HTTPHandler() http.Handler {
	return ns.streamHandler
}

func (ns *NativeServer) registerTools() {
	type emptyArgs struct{}

	type schemaArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID. Omit to use the default active connection, or call list_connections first."`
		Schema       *string  `json:"schema,omitempty" jsonschema:"Optional schema or database name filter."`
	}

	type describeArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID. Omit to use the default active connection, or call list_connections first."`
		Table        string   `json:"table" jsonschema:"Table name to describe."`
		Schema       *string  `json:"schema,omitempty" jsonschema:"Optional schema or database name."`
	}

	type sqlArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID. Omit to use the default active connection, or call list_connections first."`
		SQL          string   `json:"sql" jsonschema:"Read-only SELECT statement. LIMIT is enforced automatically."`
	}

	registerTool(ns, "list_connections", "List saved DBO connections (id, name, type). Call this first when multiple databases are configured.", emptyArgs{}, func(ctx context.Context, _ emptyArgs) (string, error) {
		return ns.registry.Execute(ctx, "list_connections", map[string]any{}, serviceDbtools.ToolContext{})
	})

	registerTool(ns, "list_tables", "List table names in a DBO connection. Uses the default active connection when connection_id is omitted.", schemaArgs{}, func(ctx context.Context, in schemaArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, in.Schema, "list_tables", map[string]any{"schema": ptrStr(in.Schema)})
	})

	registerTool(ns, "list_views", "List view names in a DBO connection. Uses the default active connection when connection_id is omitted.", schemaArgs{}, func(ctx context.Context, in schemaArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, in.Schema, "list_views", map[string]any{"schema": ptrStr(in.Schema)})
	})

	registerTool(ns, "describe_table", "Describe columns, primary keys, and foreign keys for a table.", describeArgs{}, func(ctx context.Context, in describeArgs) (string, error) {
		args := map[string]any{"table": in.Table}
		if in.Schema != nil {
			args["schema"] = *in.Schema
		}

		return ns.runTool(ctx, in.ConnectionID, in.Schema, "describe_table", args)
	})

	registerTool(ns, "execute_sql", "Run a read-only SELECT query against a DBO connection. LIMIT is enforced automatically.", sqlArgs{}, func(ctx context.Context, in sqlArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, "execute_sql", map[string]any{"sql": in.SQL})
	})

	ns.registerNoSQLTools()
}

// registerNoSQLTools exposes the read-only MongoDB and Redis tools. They run through the same Registry (and so the
// same driver read checks) as the in-app assistant.
func (ns *NativeServer) registerNoSQLTools() {
	type containerArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID of a MongoDB or Redis connection."`
		Container    string   `json:"container" jsonschema:"Container id from list_containers (MongoDB: database/collection, Redis: db0)."`
	}

	type listArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID of a MongoDB or Redis connection."`
	}

	type browseArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID of a MongoDB or Redis connection."`
		Container    string   `json:"container" jsonschema:"Container id from list_containers."`
		Filter       string   `json:"filter,omitempty" jsonschema:"MongoDB JSON query or Redis key pattern. Empty lists everything."`
		Limit        int      `json:"limit,omitempty" jsonschema:"Items to return, at most 20."`
	}

	type itemArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID of a MongoDB or Redis connection."`
		Container    string   `json:"container" jsonschema:"Container id from list_containers."`
		Item         string   `json:"item" jsonschema:"Document _id or Redis key name."`
	}

	type commandArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID of a MongoDB or Redis connection."`
		Command      string   `json:"command" jsonschema:"One read-only MongoDB shell statement or Redis command. Writes are refused."`
	}

	type aggregateArgs struct {
		ConnectionID *float64 `json:"connection_id,omitempty" jsonschema:"Optional DBO connection ID of a MongoDB connection."`
		Container    string   `json:"container" jsonschema:"Collection id, database/collection."`
		Pipeline     string   `json:"pipeline" jsonschema:"JSON array of aggregation stages. $out and $merge are refused."`
	}

	registerTool(ns, serviceDbtools.ToolListContainers, "List the collections (MongoDB) or databases (Redis) of a connection.", listArgs{}, func(ctx context.Context, in listArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, serviceDbtools.ToolListContainers, map[string]any{})
	})

	registerTool(ns, serviceDbtools.ToolDescribeContainer, "Describe a collection or Redis database: fields, size and indexes.", containerArgs{}, func(ctx context.Context, in containerArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, serviceDbtools.ToolDescribeContainer, map[string]any{"container": in.Container})
	})

	registerTool(ns, serviceDbtools.ToolBrowseContainer, "List up to 20 documents (MongoDB) or key names (Redis) of a container, optionally filtered.", browseArgs{}, func(ctx context.Context, in browseArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, serviceDbtools.ToolBrowseContainer, map[string]any{"container": in.Container, "filter": in.Filter, "limit": float64(in.Limit)})
	})

	registerTool(ns, serviceDbtools.ToolGetItem, "Read one MongoDB document by _id or one Redis key's value.", itemArgs{}, func(ctx context.Context, in itemArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, serviceDbtools.ToolGetItem, map[string]any{"container": in.Container, "item": in.Item})
	})

	registerTool(ns, serviceDbtools.ToolRunCommand, "Run one read-only MongoDB shell statement or Redis command.", commandArgs{}, func(ctx context.Context, in commandArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, serviceDbtools.ToolRunCommand, map[string]any{"command": in.Command})
	})

	registerTool(ns, serviceDbtools.ToolAggregate, "Run a read-only MongoDB aggregation pipeline and return at most 20 documents.", aggregateArgs{}, func(ctx context.Context, in aggregateArgs) (string, error) {
		return ns.runTool(ctx, in.ConnectionID, nil, serviceDbtools.ToolAggregate, map[string]any{"container": in.Container, "pipeline": in.Pipeline})
	})
}

func registerTool[T any](ns *NativeServer, name, description string, _ T, handler func(context.Context, T) (string, error)) {
	sdkmcp.AddTool(ns.mcpServer, &sdkmcp.Tool{
		Name:        name,
		Description: description,
	}, func(ctx context.Context, _ *sdkmcp.CallToolRequest, input T) (*sdkmcp.CallToolResult, any, error) {
		result, err := handler(ctx, input)
		if err != nil {
			//nolint:nilerr // MCP protocol: surface the error in the tool result, not as a transport error.
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: err.Error()}},
				IsError: true,
			}, nil, nil
		}

		return &sdkmcp.CallToolResult{
			Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: result}},
		}, nil, nil
	})
}

func (ns *NativeServer) runTool(ctx context.Context, connID *float64, schema *string, toolName string, args map[string]any) (string, error) {
	if connID != nil {
		args["connection_id"] = *connID
	}

	var defaultID *uint

	if ns.settingsRepo != nil {
		if settings, err := ns.settingsRepo.FindByOwner(ctx, helper.CtxOwnerID(ctx)); err == nil {
			defaultID = settings.DefaultConnectionID
		}
	}

	resolved, err := ns.registry.ResolveConnectionID(ctx, args, defaultID)
	if err != nil {
		return "", err
	}

	toolCtx := serviceDbtools.ToolContext{ConnectionID: resolved}
	if schema != nil {
		toolCtx.Schema = schema
	}

	return ns.registry.Execute(ctx, toolName, args, toolCtx)
}

func ptrStr(s *string) any {
	if s == nil {
		return nil
	}

	return *s
}
