package serviceDbtools

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/shared"
)

const (
	ToolListTables          = "list_tables"
	ToolListViews           = "list_views"
	ToolDescribeTable       = "describe_table"
	ToolExecuteSQL          = "execute_sql"
	ToolProposeSchemaChange = "propose_schema_change"
	ToolExecuteWrite        = "execute_write"
)

// agentOnlyTools never execute against the database themselves: they only
// surface a proposal that the user must accept through the regular APIs.
var agentOnlyTools = map[string]bool{
	ToolProposeSchemaChange: true,
	ToolExecuteWrite:        true,
}

// AllowedTool is the server-side source of truth for which tools a chat turn
// may call. Ask mode is limited to read-only inspection tools.
func AllowedTool(agent bool, name string) bool {
	switch name {
	case ToolListTables, ToolListViews, ToolDescribeTable, ToolExecuteSQL:
		return true
	}

	return agent && agentOnlyTools[name]
}

// ChatTools returns OpenAI tool definitions for the internal chat agent.
func ChatTools(agent bool) []openai.ChatCompletionToolUnionParam {
	tools := []openai.ChatCompletionToolUnionParam{
		functionTool(ToolListTables, "List table names in the connected database.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"schema": map[string]any{
					"type":        "string",
					"description": "Optional schema/database name filter.",
				},
			},
		}),
		functionTool(ToolListViews, "List view names in the connected database.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"schema": map[string]any{
					"type":        "string",
					"description": "Optional schema/database name filter.",
				},
			},
		}),
		functionTool(ToolDescribeTable, "Describe columns, primary keys, and foreign keys for a table.", shared.FunctionParameters{
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
		functionTool(ToolExecuteSQL, "Run a read-only SELECT query against the database. Returns rows as JSON.", shared.FunctionParameters{
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

	if !agent {
		return tools
	}

	column := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"name":    map[string]any{"type": "string"},
			"type":    map[string]any{"type": "string", "description": "Column data type in the connection's SQL dialect."},
			"notNull": map[string]any{"type": "boolean"},
			"primary": map[string]any{"type": "boolean"},
			"default": map[string]any{"type": "string", "description": "Default expression, verbatim SQL."},
		},
		"required": []string{"name", "type"},
	}

	return append(tools,
		functionTool(ToolProposeSchemaChange, "Propose schema changes (create tables, add columns, add foreign keys). "+
			"Changes are shown to the user on the diagram and are NOT applied until the user accepts them.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"ops": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"op": map[string]any{
								"type": "string",
								"enum": []string{dto.SchemaChangeCreateTable, dto.SchemaChangeAddColumn, dto.SchemaChangeAddForeignKey},
							},
							"table":      map[string]any{"type": "string"},
							"columns":    map[string]any{"type": "array", "items": column, "description": "create_table only: every column of the new table."},
							"column":     column,
							"fkColumns":  map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "add_foreign_key only: source columns on table."},
							"refTable":   map[string]any{"type": "string"},
							"refColumns": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
							"onDelete":   map[string]any{"type": "string", "enum": []string{"NO ACTION", "CASCADE", "SET NULL", "RESTRICT"}},
						},
						"required": []string{"op", "table"},
					},
				},
			},
			"required": []string{"ops"},
		}),
		functionTool(ToolExecuteWrite, "Request running a single INSERT/UPDATE/DELETE or DDL statement. "+
			"The statement is shown to the user and only runs if they confirm it.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"sql": map[string]any{
					"type":        "string",
					"description": "The write statement. UPDATE/DELETE must have a WHERE clause.",
				},
			},
			"required": []string{"sql"},
		}),
	)
}

func functionTool(name, description string, params shared.FunctionParameters) openai.ChatCompletionToolUnionParam {
	return openai.ChatCompletionFunctionTool(shared.FunctionDefinitionParam{
		Name:        name,
		Description: openai.String(description),
		Parameters:  params,
	})
}
