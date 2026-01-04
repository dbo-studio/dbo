package databaseSqlite

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	switch tabID {
	case contract.TableTab:
		return r.getTableInfo(ctx, nodeID, action)
	case contract.TableColumnsTab:
		return r.getTableColumns(ctx, nodeID)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(ctx, nodeID)
	case contract.TableKeysTab:
		return r.getTableKeys(ctx, nodeID)
	case contract.ViewTab:
		return r.getViewInfo(ctx, nodeID)
	default:
		return nil, fmt.Errorf("SQLite: unsupported tab: %s", tabID)
	}
}

func (r *SQLiteRepository) getTableInfo(ctx context.Context, nodeID string, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.tableFields(ctx, action)

	tables, err := r.getAllTableList()
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, table := range tables {
		if table.Name == nodeID {
			result = append(result, map[string]any{
				"name":          table.Name,
				"temporary":     false,
				"strict":        false,
				"without_rowid": false,
			})
		}
	}

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *SQLiteRepository) getTableColumns(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.tableColumnFields()
	columns, err := r.getColumns(nodeID, []string{}, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, column := range columns {
		result = append(result, map[string]any{
			"name":              column.ColumnName,
			"type":              column.DataType,
			"not_null":          column.IsNullable == "0",
			"dflt_value":        column.ColumnDefault.String,
			"column_kind":       "NORMAL",
			"on_null_conflicts": "",
			"collection_name":   "",
		})
	}

	return helper.BuildFormResponseFromResults(result, fields)
}

func (r *SQLiteRepository) getTableForeignKeys(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.foreignKeyFields(ctx, nodeID)
	foreignKeys, err := r.foreignKeys(ctx, nodeID, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, foreignKey := range foreignKeys {
		result = append(result, map[string]any{
			"constraint_name":    foreignKey.ConstraintName,
			"target_table":       foreignKey.TargetTable,
			"ref_columns":        foreignKey.Columns,
			"target_columns":     foreignKey.RefColumns,
			"update_action":      foreignKey.UpdateAction,
			"delete_action":      foreignKey.DeleteAction,
			"is_deferrable":      foreignKey.IsDeferrable,
			"initially_deferred": foreignKey.InitiallyDeferred,
		})
	}

	response, err := helper.BuildFormResponseFromResults(result, fields)
	if err != nil {
		return nil, err
	}

	return response, nil
}

func (r *SQLiteRepository) getTableKeys(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.keyFields(ctx, nodeID)

	columns, err := r.getColumns(nodeID, []string{}, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}

	pkColumns := []string{}
	for _, column := range columns {
		if column.IsPrimaryKey == "1" {
			pkColumns = append(pkColumns, column.ColumnName)
		}
	}

	if len(pkColumns) > 0 {
		result = append(result, map[string]any{
			"name":    "PRIMARY",
			"type":    "PRIMARY KEY",
			"columns": pkColumns,
		})
	}

	return helper.BuildFormResponseFromResults(result, fields)
}

func (r *SQLiteRepository) getViewInfo(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.viewFields()
	views, err := r.views(ctx, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, view := range views {
		if view.Name == nodeID {
			query := ""
			if view.Query != nil {
				query = *view.Query
			}
			result = append(result, map[string]any{
				"name":  view.Name,
				"query": query,
			})
		}
	}

	return helper.BuildObjectFormResponseFromResults(result, fields)
}
