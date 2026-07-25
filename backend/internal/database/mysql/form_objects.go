package databaseMysql

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *MySQLRepository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	node := r.base.ExtractNode(nodeID)

	switch tabID {
	case contract.DatabaseTab:
		return r.getDatabaseInfo(ctx, node)
	case contract.TableColumnsTab:
		return r.getTableColumns(ctx, node, action)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(ctx, node, action)
	case contract.TableKeysTab:
		return r.getTableKeys(ctx, node, action)
	case contract.TableIndexesTab:
		return r.getTableIndexes(ctx, node, action)
	case contract.ViewTab:
		return r.getViewInfo(ctx, node)
	default:
		return nil, fmt.Errorf("MySQL: unsupported tab: %s", tabID)
	}
}

func (r *MySQLRepository) getDatabaseInfo(ctx context.Context, node contract.DBNode) (*contract.FormResponse, error) {
	fields := r.databaseFields(ctx)

	databases, err := r.databases(ctx, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, database := range databases {
		if database.Name == node.Database {
			result = append(result, map[string]any{
				"datname": database.Name,
			})
		}
	}

	row := map[string]any{}
	if len(result) > 0 {
		row = result[0]
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}

func (r *MySQLRepository) databaseFields(_ context.Context) []contract.FormField {
	return []contract.FormField{
		{ID: "datname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
	}
}

func (r *MySQLRepository) getTableGeneralFields(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) ([]contract.GeneralField, error) {
	fields := r.tableFields(ctx, action)
	result := map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		tables, err := r.tables(ctx, &node.Database, true)
		if err != nil {
			return nil, err
		}

		for _, table := range tables {
			if table.Name == node.Table {
				result = map[string]any{
					"relname":     table.Name,
					"description": table.Comment,
					"ENGINE":      table.Engine,
					"ROW_FORMAT":  table.RowFormat,
				}
				break
			}
		}
	}

	return r.base.BuildGeneralFormFieldsFromSchema(fields, result)
}

func (r *MySQLRepository) getTableColumns(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.tableColumnFields()
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		columns, err := r.columns(ctx, &node.Database, &node.Table, []string{}, true, true)
		if err != nil {
			return nil, err
		}

		for _, column := range columns {
			result = append(result, map[string]any{
				"column_name":              column.ColumnName,
				"data_type":                column.DataType,
				"not_null":                 column.IsNullable == "NO",
				"column_default":           column.ColumnDefault,
				"comment":                  column.Comment,
				"character_maximum_length": column.CharacterMaximumLength,
				"numeric_scale":            column.NumericScale,
				"is_identity":              false,
			})
		}
	}

	tableInfo, err := r.getTableGeneralFields(ctx, node, action)
	if err != nil {
		return nil, err
	}

	return r.base.BuildHybridFormResponse(tableInfo, result, fields)
}

func (r *MySQLRepository) getTableForeignKeys(ctx context.Context, node contract.DBNode, _ contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.foreignKeyFields(ctx, fmt.Sprintf("%s.%s", node.Database, node.Table))
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		foreignKeys, err := r.foreignKeys(ctx, &node.Database, &node.Table, true)
		if err != nil {
			return nil, err
		}

		for _, foreignKey := range foreignKeys {
			result = append(result, map[string]any{
				"constraint_name": foreignKey.ConstraintName,
				"target_table":    foreignKey.TargetTable,
				"ref_columns":     foreignKey.ColumnsList,
				"target_columns":  foreignKey.RefColumnsList,
				"update_action":   foreignKey.UpdateAction,
				"delete_action":   foreignKey.DeleteAction,
			})
		}
	}

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *MySQLRepository) getTableKeys(ctx context.Context, node contract.DBNode, _ contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.keyFields(ctx, fmt.Sprintf("%s.%s", node.Database, node.Table))
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		primaryKeys, err := r.primaryKeys(ctx, &node.Database, &node.Table, true)
		if err != nil {
			return nil, err
		}

		if len(primaryKeys) > 0 {
			columns := make([]string, len(primaryKeys))
			for i, pk := range primaryKeys {
				columns[i] = pk.ColumnName
			}
			result = append(result, map[string]any{
				"constraint_name": "PRIMARY",
				"constraint_type": "PRIMARY KEY",
				"ref_columns":     columns,
			})
		}
	}

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *MySQLRepository) getTableIndexes(ctx context.Context, node contract.DBNode, _ contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.indexOptions(ctx, fmt.Sprintf("%s.%s", node.Database, node.Table))
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		indexes, err := r.tableIndexes(ctx, node.Database, node.Table)
		if err != nil {
			return nil, err
		}

		indexMap := make(map[string]map[string]any)
		indexOrder := make([]string, 0)

		for _, index := range indexes {
			if index.IndexName == "PRIMARY" {
				continue
			}

			entry, exists := indexMap[index.IndexName]
			if !exists {
				entry = map[string]any{
					"index_name":  index.IndexName,
					"ref_columns": []string{},
					"non_unique":  index.NonUnique == 1,
					"collation":   index.Collation,
				}
				indexMap[index.IndexName] = entry
				indexOrder = append(indexOrder, index.IndexName)
			}

			cols := entry["ref_columns"].([]string)
			entry["ref_columns"] = append(cols, index.ColumnName)
		}

		for _, name := range indexOrder {
			result = append(result, indexMap[name])
		}
	}

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *MySQLRepository) getViewInfo(ctx context.Context, node contract.DBNode) (*contract.FormResponse, error) {
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
				"name":    view.Name,
				"comment": view.Comment,
				"query":   query,
			})
		}
	}

	row := map[string]any{}
	if len(result) > 0 {
		row = result[0]
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}
