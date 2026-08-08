package databasePostgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

const sqlDriverPostgres = "postgresql"

func (r *PostgresRepository) UpdateQuery(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("nil request")
	}

	node := r.base.ExtractNode(req.NodeID)
	if node.Schema == "" || node.Table == "" {
		return nil, fmt.Errorf("invalid node: schema or table missing")
	}

	queries, err := r.generateQueries(ctx, req, node)
	if err != nil {
		return nil, err
	}

	if len(queries) == 0 {
		return &dto.UpdateQueryResponse{
			Query:        []string{},
			RowsAffected: 0,
		}, nil
	}

	rowsAffected := 0

	conn, err := r.db(ctx, &node.Database)
	if err != nil {
		return nil, err
	}

	err = conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			result := tx.Exec(query)
			if result.Error != nil {
				return result.Error
			}

			rowsAffected += int(result.RowsAffected)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &dto.UpdateQueryResponse{
		Query:        queries,
		RowsAffected: rowsAffected,
	}, nil
}

func (r *PostgresRepository) generateQueries(ctx context.Context, req *dto.UpdateQueryRequest, node contract.DBNode) ([]string, error) {
	columnTypes, err := r.columnTypeMap(ctx, node)
	if err != nil {
		return nil, err
	}

	var queries []string

	queries = append(queries, r.generateUpdateQueries(ctx, req, node, columnTypes)...)

	inserts, err := r.generateInsertQueries(ctx, req, node, columnTypes)
	if err != nil {
		return nil, err
	}

	queries = append(queries, inserts...)
	queries = append(queries, r.generateDeleteQueries(ctx, req, node)...)

	return queries, nil
}

func (r *PostgresRepository) columnTypeMap(ctx context.Context, node contract.DBNode) (map[string]string, error) {
	columns, err := r.columns(ctx, &node.Database, &node.Table, &node.Schema, []string{}, true, true)
	if err != nil {
		return nil, err
	}

	out := make(map[string]string, len(columns))
	for _, column := range columns {
		out[column.ColumnName] = column.DataType
	}

	return out, nil
}

func (r *PostgresRepository) generateUpdateQueries(ctx context.Context, req *dto.UpdateQueryRequest, node contract.DBNode, columnTypes map[string]string) []string {
	if req == nil || req.EditedItems == nil {
		return nil
	}

	var queries []string

	keys, err := r.primaryKeys(ctx, &node.Database, &node.Table, &node.Schema, true)
	if err != nil {
		return nil
	}

	primaryKeys := lo.Map(keys, func(key PrimaryKey, _ int) string {
		return key.ColumnName
	})

	for _, editedItem := range req.EditedItems {
		if len(editedItem.Values) == 0 || len(editedItem.Conditions) == 0 {
			continue
		}

		setClauses, err := buildSetClauses(editedItem.Values, columnTypes)
		if err != nil || len(setClauses) == 0 {
			continue
		}

		whereClauses := r.buildWhereClauses(ctx, primaryKeys, editedItem.Conditions)

		if len(whereClauses) == 0 {
			continue
		}

		query := fmt.Sprintf(
			`UPDATE "%s"."%s" SET %s WHERE %s`,
			node.Schema,
			node.Table,
			strings.Join(setClauses, ", "),
			strings.Join(whereClauses, " AND "),
		)

		queries = append(queries, query)
	}

	return queries
}

func (r *PostgresRepository) generateDeleteQueries(ctx context.Context, req *dto.UpdateQueryRequest, node contract.DBNode) []string {
	if req == nil || req.DeletedItems == nil {
		return nil
	}

	var queries []string

	keys, err := r.primaryKeys(ctx, &node.Database, &node.Table, &node.Schema, true)
	if err != nil {
		return nil
	}

	primaryKeys := lo.Map(keys, func(key PrimaryKey, _ int) string {
		return key.ColumnName
	})

	for _, deletedItem := range req.DeletedItems {
		if len(deletedItem) == 0 {
			continue
		}

		whereClauses := r.buildWhereClauses(ctx, primaryKeys, deletedItem)

		if len(whereClauses) == 0 {
			continue
		}

		query := fmt.Sprintf(
			`DELETE FROM "%s"."%s" WHERE %s`,
			node.Schema,
			node.Table,
			strings.Join(whereClauses, " AND "),
		)

		queries = append(queries, query)
	}

	return queries
}

func (r *PostgresRepository) generateInsertQueries(_ context.Context, req *dto.UpdateQueryRequest, node contract.DBNode, columnTypes map[string]string) ([]string, error) {
	if req == nil || req.AddedItems == nil {
		return nil, nil
	}

	var queries []string

	for _, addedItem := range req.AddedItems {
		if len(addedItem) == 0 {
			continue
		}

		var columns, values []string

		for key, value := range addedItem {
			if key == "dbo_index" || value == "@DEFAULT" {
				continue
			}

			formatted, err := formatColumnValue(key, value, columnTypes)
			if err != nil {
				return nil, err
			}

			columns = append(columns, fmt.Sprintf(`"%s"`, key))
			values = append(values, formatted)
		}

		if len(columns) == 0 {
			continue
		}

		query := fmt.Sprintf(
			`INSERT INTO "%s"."%s" (%s) VALUES (%s)`,
			node.Schema,
			node.Table,
			strings.Join(columns, ", "),
			strings.Join(values, ", "),
		)

		queries = append(queries, query)
	}

	return queries, nil
}

func buildSetClauses(values map[string]any, columnTypes map[string]string) ([]string, error) {
	var setClauses []string

	for key, value := range values {
		if key == "dbo_index" {
			continue
		}

		switch value {
		case nil:
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = NULL`, key))
		case "@DEFAULT":
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = DEFAULT`, key))
		default:
			formatted, err := formatColumnValue(key, value, columnTypes)
			if err != nil {
				return nil, err
			}

			setClauses = append(setClauses, fmt.Sprintf(`"%s" = %s`, key, formatted))
		}
	}

	return setClauses, nil
}

func formatColumnValue(columnName string, value any, columnTypes map[string]string) (string, error) {
	dbType := ""
	if columnTypes != nil {
		dbType = columnTypes[columnName]
	}

	if s, ok := value.(string); ok && databaseCore.IsGeometryDBType(dbType) {
		return databaseCore.FormatGeometrySQL(sqlDriverPostgres, dbType, s)
	}

	return helper.FormatSQLValueForDriver(sqlDriverPostgres, value)
}

func (r *PostgresRepository) buildWhereClauses(_ context.Context, primaryKeys []string, conditions map[string]any) []string {
	conditionKeys := map[string]any{}

	if len(primaryKeys) > 0 {
		for _, key := range primaryKeys {
			if conditions[key] != nil {
				conditionKeys[key] = conditions[key]
			}
		}
	}

	if len(conditionKeys) == 0 {
		conditionKeys = conditions
	}

	var whereClauses []string

	for key, value := range conditionKeys {
		if value == nil {
			whereClauses = append(whereClauses, fmt.Sprintf(`"%s" IS NULL`, key))
		} else {
			formatted, err := helper.FormatSQLValueForDriver(sqlDriverPostgres, value)
			if err != nil {
				continue
			}

			whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = %s`, key, formatted))
		}
	}

	return whereClauses
}
