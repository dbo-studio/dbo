package databaseSqlite

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *SQLiteRepository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, _ contract.TreeNodeActionName) (*contract.FormResponse, error) {
	switch tabID {
	case contract.TableColumnsTab:
		return r.getTableColumns(ctx, nodeID)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(ctx, nodeID)
	case contract.TableKeysTab:
		return r.getTableKeys(ctx, nodeID)
	case contract.TableIndexesTab:
		return r.getTableIndexes(ctx, nodeID)
	case contract.TableTriggersTab:
		return r.getTableTriggers(ctx, nodeID)
	case contract.TableChecksTab:
		return r.getTableChecks(ctx, nodeID)
	case contract.ViewTab:
		return r.getViewInfo(ctx, nodeID)
	default:
		return nil, fmt.Errorf("SQLite: unsupported tab: %s", tabID)
	}
}

func (r *SQLiteRepository) getTableInfo(ctx context.Context, nodeID string) ([]contract.GeneralField, error) {
	fields := r.tableFields()

	tables, err := r.getAllTableList(ctx)
	if err != nil {
		return nil, err
	}

	result := map[string]any{}

	for _, table := range tables {
		if table.Name == nodeID {
			result = map[string]any{
				"name":          table.Name,
				"temporary":     false,
				"strict":        false,
				"without_rowid": false,
			}
		}
	}

	return r.base.BuildGeneralFormResult(result, fields)
}

func (r *SQLiteRepository) getTableColumns(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.tableColumnFields()

	columns, err := r.getColumns(ctx, nodeID, []string{}, true)
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

	tableInfo, err := r.getTableInfo(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	return r.base.BuildHybridFormResponse(tableInfo, result, fields)
}

func (r *SQLiteRepository) getTableForeignKeys(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.foreignKeyFields(ctx, nodeID)

	foreignKeys, err := r.foreignKeys(ctx, nodeID)
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

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *SQLiteRepository) getTableKeys(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.keyFields(ctx, nodeID)

	columns, err := r.getColumns(ctx, nodeID, []string{}, true)
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

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *SQLiteRepository) getTableIndexes(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	indexes, err := r.tableIndexes(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, index := range indexes {
		result = append(result, map[string]any{
			"name":    index.Name,
			"columns": index.Columns,
			"unique":  index.Unique,
			"order":   index.Order,
		})
	}

	return r.base.BuildArrayFormResponse(result, r.indexFields(ctx, nodeID))
}

func (r *SQLiteRepository) getTableTriggers(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	triggers, err := r.tableTriggers(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, trigger := range triggers {
		result = append(result, map[string]any{
			"name":   trigger.Name,
			"timing": trigger.Timing,
			"event":  trigger.Event,
			"when":   trigger.When,
			"body":   trigger.Body,
		})
	}

	return r.base.BuildArrayFormResponse(result, r.triggerFields())
}

func (r *SQLiteRepository) getTableChecks(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	// A table that is not created yet has no DDL, hence no checks.
	tableDDL, _ := r.getTableDDL(ctx, nodeID)

	result := []map[string]any{}
	for _, check := range parseChecks(tableDDL) {
		result = append(result, map[string]any{
			"name":       check.Name,
			"expression": check.Expression,
		})
	}

	return r.base.BuildArrayFormResponse(result, r.checkFields())
}

func (r *SQLiteRepository) getViewInfo(ctx context.Context, nodeID string) (*contract.FormResponse, error) {
	fields := r.viewFields()

	views, err := r.views(ctx)
	if err != nil {
		return nil, err
	}

	row := map[string]any{}

	for _, view := range views {
		if view.Name == nodeID {
			query := ""
			if view.Query != nil {
				query = *view.Query
			}

			row = map[string]any{
				"name":  view.Name,
				"query": query,
			}

			break
		}
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}
