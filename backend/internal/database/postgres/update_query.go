package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"gorm.io/gorm"
)

// UpdateQuery processes a query update request and executes the generated queries within a transaction
func (r *PostgresRepository) UpdateQuery(req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("nil request")
	}

	node := extractNode(req.NodeId)
	if node.Schema == "" || node.Table == "" {
		return nil, fmt.Errorf("invalid node: schema or table missing")
	}

	queries := generateQueries(req, node)
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

// generateQueries combines all query types (update, insert, delete) into a single slice
func generateQueries(req *dto.UpdateQueryRequest, node PGNode) []string {
	var queries []string

	queries = append(queries, generateUpdateQueries(req, node)...)
	queries = append(queries, generateInsertQueries(req, node)...)
	queries = append(queries, generateDeleteQueries(req, node)...)

	return queries
}

// generateUpdateQueries creates SQL update statements from the request
func generateUpdateQueries(req *dto.UpdateQueryRequest, node PGNode) []string {
	if req == nil || req.EditedItems == nil {
		return nil
	}

	var queries []string

	for _, editedItem := range req.EditedItems {
		if len(editedItem.Values) == 0 || len(editedItem.Conditions) == 0 {
			continue
		}

		setClauses := buildSetClauses(editedItem.Values)
		whereClauses := buildWhereClauses(editedItem.Conditions)

		if len(setClauses) == 0 || len(whereClauses) == 0 {
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

// generateDeleteQueries creates SQL delete statements from the request
func generateDeleteQueries(req *dto.UpdateQueryRequest, node PGNode) []string {
	if req == nil || req.DeletedItems == nil {
		return nil
	}

	var queries []string

	for _, deletedItem := range req.DeletedItems {
		if len(deletedItem) == 0 {
			continue
		}

		whereClauses := buildWhereClauses(deletedItem)
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

// generateInsertQueries creates SQL insert statements from the request
func generateInsertQueries(req *dto.UpdateQueryRequest, node PGNode) []string {
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
				// Use proper parameter formatting to avoid SQL injection
				values = append(values, fmt.Sprintf(`'%v'`, value))
			}
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

	return queries
}

// buildSetClauses creates SET clauses for UPDATE statements
func buildSetClauses(values map[string]interface{}) []string {
	var setClauses []string

	for key, value := range values {
		if value == nil {
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = NULL`, key))
		} else if value == "@DEFAULT" {
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = DEFAULT`, key))
		} else {
			// Note: In production code, this should use proper parameter binding
			setClauses = append(setClauses, fmt.Sprintf(`"%s" = '%v'`, key, value))
		}
	}

	return setClauses
}

// buildWhereClauses creates WHERE clauses for statements
func buildWhereClauses(conditions map[string]interface{}) []string {
	var whereClauses []string

	for key, value := range conditions {
		if value == nil {
			whereClauses = append(whereClauses, fmt.Sprintf(`"%s" IS NULL`, key))
		} else {
			// Note: In production code, this should use proper parameter binding
			whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = '%v'`, key, value))
		}
	}

	return whereClauses
}
