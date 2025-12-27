package databasePostgres

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	node := extractNode(nodeID)

	switch tabID {
	case contract.DatabaseTab:
		return r.getDatabaseInfo(ctx, node)
	case contract.SchemaTab:
		return r.getSchemaInfo(ctx, node)
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
	case contract.MaterializedViewTab:
		return r.getMaterializedViewInfo(ctx, node)
	default:
		return nil, fmt.Errorf("PostgreSQL: unsupported tab: %s", tabID)
	}
}

func (r *PostgresRepository) getDatabaseInfo(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
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

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *PostgresRepository) getSchemaInfo(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
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

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *PostgresRepository) getTableInfo(ctx context.Context, node PGNode, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	fields := r.tableFields(ctx, action)

	tables, err := r.tables(ctx, &node.Schema, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, table := range tables {
		if table.Name == node.Table {
			result = append(result, map[string]any{
				"relname":     table.Name,
				"description": table.Description,
				"persistence": table.Persistence,
				"tablespace":  table.TableSpace,
				"rolname":     table.Owner,
			})
		}
	}

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *PostgresRepository) getTableColumns(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
	fields := r.tableColumnFields()
	columns, err := r.columns(ctx, &node.Table, &node.Schema, []string{}, true, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
	for _, column := range columns {
		result = append(result, map[string]any{
			"column_name":              column.ColumnName,
			"data_type":                column.DataType,
			"not_null":                 column.IsNullable == "NO",
			"primary":                  column.PrimaryKey != nil,
			"column_default":           column.ColumnDefault,
			"comment":                  column.Comment,
			"character_maximum_length": column.CharacterMaximumLength,
			"numeric_scale":            column.NumericScale,
			"is_identity":              column.IsIdentity,
			"is_generated":             column.IsGenerated,
		})
	}

	return helper.BuildFormResponseFromResults(result, fields)
}

func (r *PostgresRepository) getTableForeignKeys(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
	fields := r.foreignKeyFields(ctx, node)
	foreignKeys, err := r.foreignKeys(ctx, &node.Table, &node.Schema, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
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

	response, err := helper.BuildFormResponseFromResults(result, fields)
	if err != nil {
		return nil, err
	}

	return response, nil
}

func (r *PostgresRepository) getTableKeys(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
	fields := r.keyFields(ctx, node)
	keys, err := r.tableKeys(ctx, &node.Table, &node.Schema, true)
	if err != nil {
		return nil, err
	}

	result := []map[string]any{}
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

	return helper.BuildFormResponseFromResults(result, fields)
}

func (r *PostgresRepository) getViewInfo(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
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

	return helper.BuildObjectFormResponseFromResults(result, fields)
}

func (r *PostgresRepository) getMaterializedViewInfo(ctx context.Context, node PGNode) (*contract.FormResponse, error) {
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

	return helper.BuildObjectFormResponseFromResults(result, fields)
}
