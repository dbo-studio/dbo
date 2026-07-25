package dbtools

import (
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/shared"
)

// ChatTools returns OpenAI tool definitions for the internal chat agent.
func ChatTools() []openai.ChatCompletionToolUnionParam {
	return []openai.ChatCompletionToolUnionParam{
		functionTool("list_tables", "List table names in the connected database.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"schema": map[string]any{
					"type":        "string",
					"description": "Optional schema/database name filter.",
				},
			},
		}),
		functionTool("list_views", "List view names in the connected database.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"schema": map[string]any{
					"type":        "string",
					"description": "Optional schema/database name filter.",
				},
			},
		}),
		functionTool("describe_table", "Describe columns, primary keys, and foreign keys for a table.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"table": map[string]any{
					"type":        "string",
					"description": "Table name to describe.",
				},
				"schema": map[string]any{
					"type":        "string",
					"description": "Optional schema/database name.",
				},
			},
			"required": []string{"table"},
		}),
		functionTool("execute_sql", "Run a read-only SELECT query against the database. Returns rows as JSON.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"sql": map[string]any{
					"type":        "string",
					"description": "SELECT statement only. LIMIT is enforced automatically.",
				},
			},
			"required": []string{"sql"},
		}),
	}
}

func functionTool(name, description string, params shared.FunctionParameters) openai.ChatCompletionToolUnionParam {
	return openai.ChatCompletionFunctionTool(shared.FunctionDefinitionParam{
		Name:        name,
		Description: openai.String(description),
		Parameters:  params,
	})
}

// MCPToolDefinitions documents tools exposed via the native MCP server.
func MCPToolDefinitions() []ToolDefinition {
	return []ToolDefinition{
		{Name: "list_connections", Description: "List saved DBO connections (id, name, type). Call this first when multiple databases are configured."},
		{Name: "list_tables", Description: "List table names in a DBO connection. Uses the default active connection when connection_id is omitted."},
		{Name: "list_views", Description: "List view names in a DBO connection. Uses the default active connection when connection_id is omitted."},
		{Name: "describe_table", Description: "Describe columns, primary keys, and foreign keys for a table."},
		{Name: "execute_sql", Description: "Run a read-only SELECT query against a DBO connection. LIMIT is enforced automatically."},
	}
}

type ToolDefinition struct {
	Name        string
	Description string
}
