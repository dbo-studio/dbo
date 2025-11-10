package databaseSqlite

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

func (r *SQLiteRepository) UpdateQuery(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("nil request")
	}

	if req.NodeId == "" {
		return nil, fmt.Errorf("invalid node: table missing")
	}

	queries := r.generateQueries(req, req.NodeId)
	if len(queries) == 0 {
		return &dto.UpdateQueryResponse{
			Query:        []string{},
			RowsAffected: 0,
		}, nil
	}

	rowsAffected := 0
	err := r.db.Transaction(func(tx *gorm.DB) error {
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

func (r *SQLiteRepository) generateQueries(req *dto.UpdateQueryRequest, node string) []string {
	var queries []string

	queries = append(queries, r.generateUpdateQueries(req, node)...)
	queries = append(queries, r.generateInsertQueries(req, node)...)
	queries = append(queries, r.generateDeleteQueries(req, node)...)

	return queries
}

func (r *SQLiteRepository) generateUpdateQueries(req *dto.UpdateQueryRequest, node string) []string {
	if req == nil || req.EditedItems == nil {
		return nil
	}

	var queries []string

	keys, err := r.getPrimaryKeys(Table{node})
	if err != nil {
		return nil
	}

	for _, editedItem := range req.EditedItems {
		if len(editedItem.Values) == 0 || len(editedItem.Conditions) == 0 {
			continue
		}

		setClauses := buildSetClauses(editedItem.Values)
		whereClauses := r.buildWhereClauses(keys, editedItem.Conditions)

		if len(setClauses) == 0 || len(whereClauses) == 0 {
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

func (r *SQLiteRepository) generateDeleteQueries(req *dto.UpdateQueryRequest, node string) []string {
	if req == nil || req.DeletedItems == nil {
		return nil
	}

	var queries []string

	keys, err := r.getPrimaryKeys(Table{node})
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

func (r *SQLiteRepository) generateInsertQueries(req *dto.UpdateQueryRequest, node string) []string {
	if req == nil || req.AddedItems == nil {
		return nil
	}

	var queries []string

	for _, addedItem := range req.AddedItems {
		if len(addedItem) == 0 {
			continue
		}

		var columns, values []string

		for key, value := range addedItem {
			if value == "@DEFAULT" {
				continue
			}

			columns = append(columns, fmt.Sprintf(`"%s"`, key))
			if value == nil {
				values = append(values, "NULL")
			} else {
				values = append(values, helper.FormatSQLValue(value))
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

	return queries
}

func buildSetClauses(values map[string]interface{}) []string {
	var setClauses []string

	for key, value := range values {
		switch value {
		case nil:
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = NULL`, key))
		case "@DEFAULT":
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = DEFAULT`, key))
		default:
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = '%v'`, key, value))
		}
	}

	return setClauses
}

func (r *SQLiteRepository) buildWhereClauses(primaryKeys []string, conditions map[string]interface{}) []string {
	conditionKeys := map[string]interface{}{}

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
			whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = '%v'`, key, value))
		}
	}

	return whereClauses
}
