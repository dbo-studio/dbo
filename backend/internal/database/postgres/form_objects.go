package databasePostgres

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	node := r.base.ExtractNode(nodeID)

	switch tabID {
	case contract.DatabaseTab:
		return r.getDatabaseInfo(ctx, node)
	case contract.SchemaTab:
		return r.getSchemaInfo(ctx, node)
	case contract.TableColumnsTab:
		return r.getTableColumns(ctx, node, action)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(ctx, node, action)
	case contract.TableKeysTab:
		return r.getTableKeys(ctx, node, action)
	case contract.ViewTab:
		return r.getViewInfo(ctx, node)
	case contract.MaterializedViewTab:
		return r.getMaterializedViewInfo(ctx, node)
	default:
		return nil, fmt.Errorf("PostgreSQL: unsupported tab: %s", tabID)
	}
}

func (r *PostgresRepository) getDatabaseInfo(ctx context.Context, node contract.DBNode) (*contract.FormResponse, error) {
	fields := r.databaseFields(ctx)

	databases, err := r.databases(ctx, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, database := range databases {
		if database.Name == node.Database {
			result = append(result, map[string]any{
				"datname":     database.Name,
				"rolname":     database.Owner,
				"template":    database.Template,
				"description": database.Description,
				"tablespace":  database.Tablespace,
			})
		}
	}

	row := map[string]any{}
	if len(result) > 0 {
		row = result[0]
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}

func (r *PostgresRepository) getSchemaInfo(ctx context.Context, node contract.DBNode) (*contract.FormResponse, error) {
	fields := r.schemaFields()
	schemas, err := r.schemas(ctx, &node.Database, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, schema := range schemas {
		if schema.Name == node.Schema {
			result = append(result, map[string]any{
				"nspname":     schema.Name,
				"rolname":     schema.Owner,
				"description": schema.Comment,
			})
		}
	}

	row := map[string]any{}
	if len(result) > 0 {
		row = result[0]
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}

func (r *PostgresRepository) getTableGeneralFields(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) ([]contract.GeneralField, error) {
	fields := r.tableFields(ctx, action)
	result := map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		tables, err := r.tables(ctx, &node.Schema, true)
		if err != nil {
			return nil, err
		}

		for _, table := range tables {
			if table.Name == node.Table {
				result = map[string]any{
					"relname":     table.Name,
					"description": table.Description,
					"persistence": table.Persistence,
					"tablespace":  table.TableSpace,
					"rolname":     table.Owner,
				}
				break
			}
		}
	}

	return r.base.BuildGeneralFormFieldsFromSchema(fields, result)
}

func (r *PostgresRepository) getTableColumns(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.tableColumnFields()
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		columns, err := r.columns(ctx, &node.Table, &node.Schema, []string{}, true, true)
		if err != nil {
			return nil, err
		}

		for _, column := range columns {
			result = append(result, map[string]any{
				"column_name":              column.ColumnName,
				"data_type":                column.DataType,
				"not_null":                 column.IsNullable == "NO",
				"primary":                  column.IsPrimaryKey,
				"column_default":           column.ColumnDefault,
				"comment":                  column.Comment,
				"character_maximum_length": column.CharacterMaximumLength,
				"numeric_scale":            column.NumericScale,
				"is_identity":              column.IsIdentity,
				"is_generated":             column.IsGenerated,
			})
		}
	}

	tableInfo, err := r.getTableGeneralFields(ctx, node, action)
	if err != nil {
		return nil, err
	}

	return r.base.BuildHybridFormResponse(tableInfo, result, fields)
}

func (r *PostgresRepository) getTableForeignKeys(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.foreignKeyFields(ctx, node)
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		foreignKeys, err := r.foreignKeys(ctx, &node.Table, &node.Schema, true)
		if err != nil {
			return nil, err
		}

		for _, foreignKey := range foreignKeys {
			result = append(result, map[string]any{
				"constraint_name":    foreignKey.ConstraintName,
				"comment":            foreignKey.Comment,
				"target_table":       foreignKey.TargetTable,
				"ref_columns":        foreignKey.RefColumnsList,
				"target_columns":     foreignKey.ColumnsList,
				"update_action":      foreignKey.UpdateAction,
				"delete_action":      foreignKey.DeleteAction,
				"is_deferrable":      foreignKey.IsDeferrable,
				"initially_deferred": foreignKey.InitiallyDeferred,
			})
		}
	}

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *PostgresRepository) getTableKeys(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.keyFields(ctx, node)
	result := []map[string]any{}

	if node.Table != "" && node.Table != string(contract.TableContainerNodeType) {
		keys, err := r.tableKeys(ctx, &node.Table, &node.Schema, true)
		if err != nil {
			return nil, err
		}

		for _, key := range keys {
			result = append(result, map[string]any{
				"name":               key.Name,
				"comment":            key.Comment,
				"primary":            key.Primary,
				"deferrable":         key.Deferrable,
				"initially_deferred": key.InitiallyDeferred,
				"columns":            key.ColumnsList,
				"exclude_operator":   key.ExcludeOperator,
			})
		}
	}

	return r.base.BuildArrayFormResponse(result, fields)
}

func (r *PostgresRepository) getViewInfo(ctx context.Context, node contract.DBNode) (*contract.FormResponse, error) {
	fields := r.viewFields()
	views, err := r.views(ctx, &node.Database, &node.Schema, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, view := range views {
		if view.Name == node.Table {
			result = append(result, map[string]any{
				"name":         view.Name,
				"comment":      view.Comment,
				"check_option": view.CheckOption,
				"query":        view.Query,
			})
		}
	}

	row := map[string]any{}
	if len(result) > 0 {
		row = result[0]
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}

func (r *PostgresRepository) getMaterializedViewInfo(ctx context.Context, node contract.DBNode) (*contract.FormResponse, error) {
	fields := r.materializedViewFields(ctx)
	materializedViews, err := r.materializedViews(ctx, &node.Schema, true)
	if err != nil {
		return nil, err
	}
	result := []map[string]any{}

	for _, materializedView := range materializedViews {
		if materializedView.Name == node.Table {
			result = append(result, map[string]any{
				"name":       materializedView.Name,
				"comment":    materializedView.Comment,
				"tablespace": materializedView.Tablespace,
				"rolname":    materializedView.Owner,
				"query":      materializedView.Query,
			})
		}
	}

	row := map[string]any{}
	if len(result) > 0 {
		row = result[0]
	}

	return r.base.BuildGeneralFormResponse(fields, row)
}
