package databasePostgres

import (
	"errors"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) RunQuery(req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	node := extractNode(req.NodeId)
	query := r.runQueryGenerator(req, node)
	queryResults := make([]map[string]any, 0)

	if node.Table == "" {
		return nil, errors.New("table or view not found")
	}

	result := r.db.Raw(query).Find(&queryResults)
	if result.Error != nil {
		return nil, result.Error
	}

	for i, row := range queryResults {
		queryResults[i]["dbo_index"] = i
		queryResults[i] = helper.SanitizeQueryResults(row)
	}

	columns, err := r.getColumns(node.Table, &node.Schema, req.Columns, true)
	if err != nil {
		return nil, result.Error
	}

	return &dto.RunQueryResponse{
		Query:   query,
		Columns: columnListToResponse(columns),
		Data:    queryResults,
	}, nil
}

func (r *PostgresRepository) runQueryGenerator(dto *dto.RunQueryRequest, node PGNode) string {
	var sb strings.Builder

	// SELECT clause
	selectColumns := "*"
	if len(dto.Columns) > 0 {
		selectColumns = strings.Join(dto.Columns, ", ")
	}
	_, _ = fmt.Fprintf(&sb, "SELECT %s FROM %q", selectColumns, node.Table)

	// WHERE clause
	if len(dto.Filters) > 0 {
		sb.WriteString(" WHERE ")
		for i, filter := range dto.Filters {
			_, _ = fmt.Fprintf(&sb, "%s %s '%s'", filter.Column, filter.Operator, filter.Value)
			if i < len(dto.Filters)-1 {
				_, _ = fmt.Fprintf(&sb, " %s ", filter.Next)
			}
		}
	}

	// ORDER BY clause
	if len(dto.Sorts) > 0 {
		sb.WriteString(" ORDER BY ")
		sortClauses := make([]string, len(dto.Sorts))
		for i, sort := range dto.Sorts {
			sortClauses[i] = fmt.Sprintf("%s %s", sort.Column, sort.Operator)
		}
		sb.WriteString(strings.Join(sortClauses, ", "))
	} else {
		keys, err := r.getPrimaryKeys(Table{node.Table})
		if err == nil && len(keys) > 0 {
			sb.WriteString(" ORDER BY ")
			sb.WriteString(strings.Join(keys, ", "))
		}
	}

	// LIMIT and OFFSET
	limit := 100
	if dto.Limit != nil && lo.FromPtr(dto.Limit) > 0 {
		limit = lo.FromPtr(dto.Limit)
	}

	offset := 0
	if dto.Page != nil && lo.FromPtr(dto.Page) > 0 {
		offset = (*dto.Page - 1) * limit
	}

	_, _ = fmt.Fprintf(&sb, " LIMIT %d OFFSET %d;", limit, offset)

	return sb.String()
}
