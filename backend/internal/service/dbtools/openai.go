package serviceDbtools

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/shared"
	"github.com/samber/lo"
)

const (
	ToolListTables          = "list_tables"
	ToolListViews           = "list_views"
	ToolDescribeTable       = "describe_table"
	ToolExecuteSQL          = "execute_sql"
	ToolProposeSchemaChange = "propose_schema_change"
	ToolPreviewWrite        = "preview_write"
	ToolUpdatePlan          = "update_plan"
	ToolShowChart           = "show_chart"
	ToolSaveReport          = "save_report"
	ToolPinReport           = "pin_report"
)

// agentOnlyTools never execute against the database themselves: they only
// surface a proposal that the user must accept through the regular APIs.
var agentOnlyTools = map[string]bool{
	ToolProposeSchemaChange: true,
	ToolPreviewWrite:        true,
	ToolUpdatePlan:          true,
}

// AllowedTool is the server-side source of truth for which tools a chat turn
// may call. Ask mode is limited to read-only inspection tools, and a connection
// whose agent level is data_write never gets schema proposals.
func AllowedTool(agent bool, tier string, name string) bool {
	switch name {
	case ToolListTables, ToolListViews, ToolDescribeTable, ToolExecuteSQL, ToolShowChart, ToolSaveReport, ToolPinReport:
		return true
	case ToolProposeSchemaChange:
		if tier == TierDataWrite {
			return false
		}
	}

	return agent && agentOnlyTools[name]
}

// Agent levels of a connection (model.AgentTier values).
const (
	TierReadOnly  = "read_only"
	TierDataWrite = "data_write"
)

// ChatTools returns the tool definitions a turn may use, filtered by AllowedTool.
func ChatTools(agent bool, tier string) []openai.ChatCompletionToolUnionParam {
	return lo.Filter(allChatTools(agent), func(tool openai.ChatCompletionToolUnionParam, _ int) bool {
		return tool.OfFunction == nil || AllowedTool(agent, tier, tool.OfFunction.Function.Name)
	})
}

func allChatTools(agent bool) []openai.ChatCompletionToolUnionParam {
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
		functionTool(ToolShowChart, "Show the user a chart of a read-only SELECT. Use it when the answer is numbers over categories or time "+
			"(totals per group, trends by month, shares of a whole). The result rows come back to you too.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"sql":   map[string]any{"type": "string", "description": "SELECT that returns the label column first and the numbers after it. LIMIT is enforced automatically."},
				"title": map[string]any{"type": "string", "description": "Short chart title, e.g. \"Revenue by month\"."},
				"type": map[string]any{
					"type":        "string",
					"enum":        []string{"bar", "line", "area", "pie", "number", "table"},
					"description": "line or area for time, bar for categories, pie for a few shares of a whole, number for a single value.",
				},
				"x":       map[string]any{"type": "string", "description": "Column for categories or time."},
				"y":       map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "Number columns to plot."},
				"stacked": map[string]any{"type": "boolean"},
			},
			"required": []string{"sql", "title"},
		}),
		functionTool(ToolSaveReport, "Save a chart as a report the user can reopen and refresh later. Use it when the user asks to save, keep or pin a chart.",
			shared.FunctionParameters{
				"type": "object",
				"properties": map[string]any{
					"title":   map[string]any{"type": "string"},
					"sql":     map[string]any{"type": "string", "description": "The SELECT the report runs."},
					"type":    map[string]any{"type": "string", "enum": []string{"bar", "line", "area", "pie", "number", "table"}},
					"x":       map[string]any{"type": "string"},
					"y":       map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
					"stacked": map[string]any{"type": "boolean"},
				},
				"required": []string{"title", "sql", "type"},
			}),
		functionTool(ToolPinReport, "Pin a saved report to a board (a simple dashboard) by board name; the board is created when it does not exist. "+
			"Save the report with save_report first and use the id it returns.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"reportId": map[string]any{"type": "integer", "description": "Id returned by save_report."},
				"board":    map[string]any{"type": "string", "description": "Board name, e.g. \"Sales\"."},
			},
			"required": []string{"reportId", "board"},
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
		functionTool(ToolProposeSchemaChange, "Propose schema changes (create databases and schemas, create tables, add/alter/drop columns, add indexes, add foreign keys). "+
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
								"enum": []string{dto.SchemaChangeCreateDatabase, dto.SchemaChangeCreateSchema, dto.SchemaChangeCreateTable, dto.SchemaChangeAddColumn, dto.SchemaChangeAlterColumn, dto.SchemaChangeDropColumn, dto.SchemaChangeAddIndex, dto.SchemaChangeAddForeignKey},
							},
							"table":        map[string]any{"type": "string"},
							"name":         map[string]any{"type": "string", "description": "create_database / create_schema only: the new name. Tables in the same proposal are created inside it."},
							"columns":      map[string]any{"type": "array", "items": column, "description": "create_table only: every column of the new table."},
							"column":       column,
							"columnName":   map[string]any{"type": "string", "description": "drop_column only: the column to remove."},
							"indexColumns": map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "add_index only: indexed columns."},
							"unique":       map[string]any{"type": "boolean", "description": "add_index only: create a unique index."},
							"fkColumns":    map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "add_foreign_key only: source columns on table."},
							"refTable":     map[string]any{"type": "string"},
							"refColumns":   map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
							"onDelete":     map[string]any{"type": "string", "enum": []string{"NO ACTION", "CASCADE", "SET NULL", "RESTRICT"}},
						},
						"required": []string{"op"},
					},
				},
			},
			"required": []string{"ops"},
		}),
		functionTool(ToolUpdatePlan, "Show the user a checklist of the steps you plan to take, and keep it current as you work. "+
			"Send the whole list every time; it replaces the previous one.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"steps": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"title":  map[string]any{"type": "string"},
							"status": map[string]any{"type": "string", "enum": []string{dto.PlanStepPending, dto.PlanStepInProgress, dto.PlanStepDone}},
						},
						"required": []string{"title", "status"},
					},
				},
			},
			"required": []string{"steps"},
		}),
		functionTool(ToolPreviewWrite, "Preview one INSERT, UPDATE or DELETE (UPDATE/DELETE need a WHERE): how many rows it changes and a sample of them. "+
			"Nothing changes now. The statement joins the user's proposal and runs only when the user applies it.", shared.FunctionParameters{
			"type": "object",
			"properties": map[string]any{
				"sql": map[string]any{
					"type":        "string",
					"description": "The data change. UPDATE/DELETE must have a WHERE clause.",
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
