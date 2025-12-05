package databaseSqlite

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

func (r *SQLiteRepository) RunQuery(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	node := req.NodeId
	query := r.runQueryGenerator(ctx, req, node)
	queryResults := make([]map[string]any, 0)
	columns := make([]Column, 0)

	if node == "" {
		return nil, errors.New("table or view not found")
	}

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		err := r.db.WithContext(gctx).Raw(query).Find(&queryResults).Error
		if err != nil {
			return err
		}

		for i, row := range queryResults {
			queryResults[i]["dbo_index"] = i
			queryResults[i] = helper.SanitizeQueryResults(row)
		}

		return nil
	})

	g.Go(func() error {
		result, err := r.getColumns(node, req.Columns, true)
		if err != nil {
			return err
		}
		columns = result
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &dto.RunQueryResponse{
		Query:   query,
		Columns: columnListToResponse(columns),
		Data:    queryResults,
	}, nil
}

func (r *SQLiteRepository) runQueryGenerator(ctx context.Context, dto *dto.RunQueryRequest, node string) string {
	var sb strings.Builder

	// SELECT clause
	selectColumns := "*"
	if len(dto.Columns) > 0 {
		selectColumns = strings.Join(dto.Columns, ", ")
	}
	_, _ = fmt.Fprintf(&sb, "SELECT %s FROM %q", selectColumns, node)

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
		keys, err := r.getPrimaryKeys(Table{node})
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
