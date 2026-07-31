package databaseCore

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
)

func (r *BaseRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	startTime := time.Now()
	result, err := runRawQuery(ctx, r, req)
	endTime := time.Since(startTime)

	if err != nil {
		if isContextCancelErr(ctx, err) {
			return nil, apperror.QueryCancelled()
		}
		return r.CommandResponseBuilder(result, endTime, err), nil
	}

	if !r.IsQuery(req.Query) {
		return r.CommandResponseBuilder(result, endTime, nil), nil
	}

	return result, nil
}

func isContextCancelErr(ctx context.Context, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	if ctx.Err() != nil {
		return true
	}
	return false
}

func runRawQuery(ctx context.Context, r *BaseRepository, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	queryResults := make([]map[string]any, 0)

	limit, _ := sqlguard.ResolveLimitPage(req.Limit, req.Page)

	rows, err := r.db.WithContext(ctx).Raw(req.Query).Rows()
	if err != nil {
		return &dto.RawQueryResponse{
			Query: req.Query,
			Data:  queryResults,
			Limit: limit,
			Page:  lo.FromPtrOr(req.Page, 1),
		}, err
	}

	defer func(rows *sql.Rows) {
		err := rows.Close()
		if err != nil {
			log.Printf("Error closing rows: %v", err)
		}
	}(rows)

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		var data map[string]any
		err := r.db.WithContext(ctx).ScanRows(rows, &data)
		if err != nil {
			return nil, err
		}
		queryResults = append(queryResults, data)

		if len(queryResults) >= limit {
			break
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
		queryResults[i]["editable"] = false
		queryResults[i] = r.SanitizeQueryResults(queryResults[i])
	}

	structures := make([]dto.Column, 0)

	for i, column := range columns {
		structures = append(structures, dto.Column{
			Name:       column,
			Type:       strings.ToLower(columnTypes[i].DatabaseTypeName()),
			MappedType: r.ColumnMappedFormat(columnTypes[i].Name()),
			IsActive:   true,
		})
	}

	page := 1
	if req.Page != nil && *req.Page > 0 {
		page = *req.Page
	}

	return &dto.RawQueryResponse{
		Query:   req.Query,
		Data:    queryResults,
		Columns: structures,
		Limit:   limit,
		Page:    page,
	}, nil
}
