package serviceMcp

import (
	"context"
	"net/http"
	"sync"

	"github.com/dbo-studio/dbo/internal/service/dbtools"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type NativeServer struct {
	registry      *dbtools.Registry
	mu            sync.RWMutex
	defaultConnID *uint
	mcpServer     *sdkmcp.Server
	streamHandler http.Handler
}

func NewNativeServer(registry *dbtools.Registry) *NativeServer {
	ns := &NativeServer{registry: registry}
	ns.mcpServer = sdkmcp.NewServer(&sdkmcp.Implementation{Name: "dbo", Version: "1.0.1"}, nil)
	ns.registerTools()
	ns.streamHandler = sdkmcp.NewStreamableHTTPHandler(func(_ *http.Request) *sdkmcp.Server {
		return ns.mcpServer
	}, nil)
	return ns
}

func (ns *NativeServer) SetDefaultConnectionID(id *uint) {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	ns.defaultConnID = id
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
		return ns.registry.Execute(ctx, "list_connections", map[string]any{}, dbtools.ToolContext{})
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
}

func registerTool[T any](ns *NativeServer, name, description string, _ T, handler func(context.Context, T) (string, error)) {
	sdkmcp.AddTool(ns.mcpServer, &sdkmcp.Tool{
		Name:        name,
		Description: description,
	}, func(ctx context.Context, _ *sdkmcp.CallToolRequest, input T) (*sdkmcp.CallToolResult, any, error) {
		result, err := handler(ctx, input)
		if err != nil {
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
	ns.mu.RLock()
	defaultID := ns.defaultConnID
	ns.mu.RUnlock()

	resolved, err := ns.registry.ResolveConnectionID(ctx, args, defaultID)
	if err != nil {
		return "", err
	}

	toolCtx := dbtools.ToolContext{ConnectionID: resolved}
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
