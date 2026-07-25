package databaseMysql

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

func (r *MySQLRepository) RunQuery(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	node := r.base.ExtractNode(req.NodeID)
	query := r.runQueryGenerator(ctx, req, node)
	queryResults := make([]map[string]any, 0)
	columns := make([]Column, 0)

	if node.Table == "" {
		return nil, errors.New("table or view not found")
	}

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		err := r.base.DB().WithContext(gctx).Raw(query).Find(&queryResults).Error
		if err != nil {
			return err
		}

		for i, row := range queryResults {
			queryResults[i]["dbo_index"] = i
			queryResults[i] = r.base.SanitizeQueryResults(row)
		}

		return nil
	})

	g.Go(func() error {
		result, err := r.columns(gctx, &node.Database, &node.Table, req.Columns, true, true)
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

func (r *MySQLRepository) runQueryGenerator(ctx context.Context, req *dto.RunQueryRequest, node contract.DBNode) string {
	var sb strings.Builder

	if lo.FromPtrOr(req.InlineQuery, "") != "" {
		return fmt.Sprintf("SELECT * FROM `%s`.`%s` WHERE %s", node.Database, node.Table, *req.InlineQuery)
	}

	selectColumns := "*"
	if len(req.Columns) > 0 {
		selectColumns = strings.Join(req.Columns, ", ")
	}
	_, _ = fmt.Fprintf(&sb, "SELECT %s FROM `%s`.`%s`", selectColumns, node.Database, node.Table)

	if len(req.Filters) > 0 {
		sb.WriteString(" WHERE ")
		for i, filter := range req.Filters {
			columnExpr := fmt.Sprintf("`%s`", filter.Column)
			if dto.FilterIsLikeOperator(filter.Operator) {
				columnExpr = fmt.Sprintf("CAST(`%s` AS CHAR)", filter.Column)
			}
			_, _ = fmt.Fprintf(&sb, "%s %s", columnExpr, dto.FilterPredicate(filter.Operator, filter.Value))
			if i < len(req.Filters)-1 {
				_, _ = fmt.Fprintf(&sb, " %s ", filter.Next)
			}
		}
	}

	if len(req.Sorts) > 0 {
		sb.WriteString(" ORDER BY ")
		sortClauses := make([]string, len(req.Sorts))
		for i, sort := range req.Sorts {
			sortClauses[i] = fmt.Sprintf("`%s` %s", sort.Column, sort.Operator)
		}
		sb.WriteString(strings.Join(sortClauses, ", "))
	} else {
		keys, err := r.primaryKeys(ctx, &node.Database, &node.Table, true)
		if err == nil && len(keys) > 0 {
			sb.WriteString(" ORDER BY ")
			sb.WriteString(strings.Join(lo.Map(keys, func(key PrimaryKey, _ int) string {
				return fmt.Sprintf("`%s`", key.ColumnName)
			}), ", "))
		}
	}

	limit := 100
	if req.Limit != nil && lo.FromPtr(req.Limit) > 0 {
		limit = lo.FromPtr(req.Limit)
	}

	offset := 0
	if req.Page != nil && lo.FromPtr(req.Page) > 0 {
		offset = (*req.Page - 1) * limit
	}

	_, _ = fmt.Fprintf(&sb, " LIMIT %d OFFSET %d;", limit, offset)

	return sb.String()
}
