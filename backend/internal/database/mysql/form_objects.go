package databaseMysql

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	node := extractNode(nodeID)

	switch tabID {
	case contract.DatabaseTab:
		return r.getDatabaseInfo(ctx, node)
	case contract.TableTab:
		return r.getTableInfo(ctx, node, action)
	case contract.TableColumnsTab:
		return r.getTableColumns(ctx, node)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(ctx, node)
	case contract.TableKeysTab:
		return r.getTableKeys(ctx, node)
	case contract.ViewTab:
		return r.getViewInfo(ctx, node)
	default:
		return nil, fmt.Errorf("MySQL: unsupported tab: %s", tabID)
	}
}

func (r *MySQLRepository) getDatabaseInfo(ctx context.Context, node MySQLNode) (*contract.FormResponse, error) {
	fields := r.databaseFields(ctx)

	databases, err := r.databases(ctx, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, database := range databases {
		if database.Name == node.Database {
			result = append(result, map[string]any{
				"SCHEMA_NAME": database.Name,
			})
		}
	}

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *MySQLRepository) databaseFields(ctx context.Context) []contract.FormField {
	return []contract.FormField{
		{ID: "SCHEMA_NAME", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
	}
}

func (r *MySQLRepository) getTableInfo(ctx context.Context, node MySQLNode, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.tableFields(ctx, action)

	tables, err := r.tables(ctx, &node.Database, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, table := range tables {
		if table.Name == node.Table {
			result = append(result, map[string]any{
				"TABLE_NAME":    table.Name,
				"TABLE_COMMENT": table.Comment,
				"ENGINE":        table.Engine,
				"ROW_FORMAT":    table.RowFormat,
			})
		}
	}

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *MySQLRepository) getTableColumns(ctx context.Context, node MySQLNode) (*contract.FormResponse, error) {
	fields := r.tableColumnFields()
	columns, err := r.columns(ctx, &node.Database, &node.Table, []string{}, true, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, column := range columns {
		result = append(result, map[string]any{
			"COLUMN_NAME":              column.ColumnName,
			"DATA_TYPE":                column.DataType,
			"IS_NULLABLE":              column.IsNullable == "NO",
			"COLUMN_DEFAULT":           column.ColumnDefault,
			"COLUMN_COMMENT":           column.Comment,
			"CHARACTER_MAXIMUM_LENGTH": column.CharacterMaximumLength,
			"NUMERIC_SCALE":            column.NumericScale,
			"AUTO_INCREMENT":           false,
		})
	}

	return helper.BuildFormResponseFromResults(result, fields)
}

func (r *MySQLRepository) getTableForeignKeys(ctx context.Context, node MySQLNode) (*contract.FormResponse, error) {
	fields := r.foreignKeyFields(ctx, fmt.Sprintf("%s.%s", node.Database, node.Table))
	foreignKeys, err := r.foreignKeys(ctx, &node.Database, &node.Table, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, foreignKey := range foreignKeys {
		result = append(result, map[string]any{
			"CONSTRAINT_NAME":        foreignKey.ConstraintName,
			"REFERENCED_TABLE_NAME":  foreignKey.TargetTable,
			"COLUMN_NAME":            foreignKey.ColumnsList,
			"REFERENCED_COLUMN_NAME": foreignKey.RefColumnsList,
			"UPDATE_RULE":            foreignKey.UpdateAction,
			"DELETE_RULE":            foreignKey.DeleteAction,
		})
	}

	response, err := helper.BuildFormResponseFromResults(result, fields)
	if err != nil {
		return nil, err
	}

	return response, nil
}

func (r *MySQLRepository) getTableKeys(ctx context.Context, node MySQLNode) (*contract.FormResponse, error) {
	fields := r.keyFields(ctx, fmt.Sprintf("%s.%s", node.Database, node.Table))

	primaryKeys, err := r.primaryKeys(ctx, &node.Database, &node.Table, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}

	if len(primaryKeys) > 0 {
		columns := make([]string, len(primaryKeys))
		for i, pk := range primaryKeys {
			columns[i] = pk.ColumnName
		}
		result = append(result, map[string]any{
			"CONSTRAINT_NAME": "PRIMARY",
			"CONSTRAINT_TYPE": "PRIMARY KEY",
			"COLUMN_NAME":     columns,
		})
	}

	return helper.BuildFormResponseFromResults(result, fields)
}

func (r *MySQLRepository) getViewInfo(ctx context.Context, node MySQLNode) (*contract.FormResponse, error) {
	fields := r.viewFields()
	views, err := r.views(ctx, &node.Database, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, view := range views {
		if view.Name == node.Table {
			query := ""
			if view.Query != nil {
				query = *view.Query
			}
			result = append(result, map[string]any{
				"TABLE_NAME":      view.Name,
				"TABLE_COMMENT":   view.Comment,
				"VIEW_DEFINITION": query,
			})
		}
	}

	return helper.BuildObjectFormResponseFromResults(result, fields)
}
