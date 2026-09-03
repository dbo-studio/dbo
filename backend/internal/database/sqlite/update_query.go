package databaseSqlite

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

const sqlDriverSqlite = "sqlite"

func (r *SQLiteRepository) UpdateQuery(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("nil request")
	}

	if req.NodeID == "" {
		return nil, fmt.Errorf("invalid node: table missing")
	}

	queries, err := r.generateQueries(ctx, req, req.NodeID)
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

	err = r.base.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
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

func (r *SQLiteRepository) generateQueries(ctx context.Context, req *dto.UpdateQueryRequest, node string) ([]string, error) {
	columnTypes, err := r.columnTypeMap(ctx, node)
	if err != nil {
		return nil, err
	}

	var queries []string

	queries = append(queries, r.generateUpdateQueries(ctx, req, node, columnTypes)...)

	inserts, err := r.generateInsertQueries(req, node, columnTypes)
	if err != nil {
		return nil, err
	}

	queries = append(queries, inserts...)
	queries = append(queries, r.generateDeleteQueries(ctx, req, node)...)

	return queries, nil
}

func (r *SQLiteRepository) columnTypeMap(ctx context.Context, node string) (map[string]string, error) {
	columns, err := r.getColumns(ctx, node, []string{}, true)
	if err != nil {
		return nil, err
	}

	out := make(map[string]string, len(columns))
	for _, column := range columns {
		out[column.ColumnName] = column.DataType
	}

	return out, nil
}

func (r *SQLiteRepository) generateUpdateQueries(ctx context.Context, req *dto.UpdateQueryRequest, node string, columnTypes map[string]string) []string {
	if req == nil || req.EditedItems == nil {
		return nil
	}

	var queries []string

	keys, err := r.getPrimaryKeys(ctx, Table{node})
	if err != nil {
		return nil
	}

	for _, editedItem := range req.EditedItems {
		if len(editedItem.Values) == 0 || len(editedItem.Conditions) == 0 {
			continue
		}

		setClauses, err := buildSetClauses(editedItem.Values, columnTypes)
		if err != nil || len(setClauses) == 0 {
			continue
		}

		whereClauses := r.buildWhereClauses(keys, editedItem.Conditions)

		if len(whereClauses) == 0 {
			continue
		}

		query := fmt.Sprintf(
			`UPDATE "%s" SET %s WHERE %s`,
			node,
			strings.Join(setClauses, ", "),
			strings.Join(whereClauses, " AND "),
		)

		queries = append(queries, query)
	}

	return queries
}

func (r *SQLiteRepository) generateDeleteQueries(ctx context.Context, req *dto.UpdateQueryRequest, node string) []string {
	if req == nil || req.DeletedItems == nil {
		return nil
	}

	var queries []string

	keys, err := r.getPrimaryKeys(ctx, Table{node})
	if err != nil {
		return nil
	}

	for _, deletedItem := range req.DeletedItems {
		if len(deletedItem) == 0 {
			continue
		}

		whereClauses := r.buildWhereClauses(keys, deletedItem)
		if len(whereClauses) == 0 {
			continue
		}

		query := fmt.Sprintf(
			`DELETE FROM "%s" WHERE %s`,
			node,
			strings.Join(whereClauses, " AND "),
		)

		queries = append(queries, query)
	}

	return queries
}

func (r *SQLiteRepository) generateInsertQueries(req *dto.UpdateQueryRequest, node string, columnTypes map[string]string) ([]string, error) {
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

			columns = append(columns, fmt.Sprintf(`"%s"`, key))
			if value == nil {
				values = append(values, "NULL")
			} else {
				formatted, err := formatColumnValue(key, value, columnTypes)
				if err != nil {
					return nil, err
				}

				values = append(values, formatted)
			}
		}

		if len(columns) == 0 {
			continue
		}

		query := fmt.Sprintf(
			`INSERT INTO "%s" (%s) VALUES (%s)`,
			node,
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
		return databaseCore.FormatGeometrySQL(sqlDriverSqlite, dbType, s)
	}

	return helper.FormatSQLValueForDriver(sqlDriverSqlite, value)
}

func (r *SQLiteRepository) buildWhereClauses(primaryKeys []string, conditions map[string]any) []string {
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
			formatted, err := helper.FormatSQLValueForDriver(sqlDriverSqlite, value)
			if err != nil {
				continue
			}

			whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = %s`, key, formatted))
		}
	}

	return whereClauses
}
