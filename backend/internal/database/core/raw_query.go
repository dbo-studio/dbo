package databaseCore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (r *BaseRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	db := r.db
	database := strings.TrimSpace(lo.FromPtr(req.Database))

	if database != "" {
		scoped, err := r.DBForDatabase(ctx, database)
		if err != nil {
			if isContextCancelErr(ctx, err) {
				return nil, apperror.QueryCanceled()
			}

			return r.CommandResponseBuilder(&dto.RawQueryResponse{Query: req.Query}, 0, err), nil
		}

		db = scoped
	}

	return r.RunRawQueryOn(ctx, db, req)
}

func (r *BaseRepository) RunRawQueryOn(ctx context.Context, db *gorm.DB, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	startTime := time.Now()
	result, err := runRawQuery(ctx, r, db, req)
	endTime := time.Since(startTime)

	if err != nil {
		if isContextCancelErr(ctx, err) {
			return nil, apperror.QueryCanceled()
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

func runRawQuery(ctx context.Context, r *BaseRepository, db *gorm.DB, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	queryResults := make([]map[string]any, 0)

	limit, _ := sqlguard.ResolveLimitPage(req.Limit, req.Page)

	rows, err := db.WithContext(ctx).Raw(req.Query).Rows()
	if err != nil {
		return &dto.RawQueryResponse{
			Query: req.Query,
			Data:  queryResults,
			Limit: limit,
			Page:  lo.FromPtrOr(req.Page, 1),
		}, err
	}

	defer func(rows *sql.Rows) {
		if err := rows.Close(); err != nil {
			r.Logger().Error(fmt.Errorf("failed to close rows: %w", err))
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

		err := db.WithContext(ctx).ScanRows(rows, &data)
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

	structures := make([]dto.Column, 0, len(columns))
	columnMappedTypes := make(map[string]string, len(columns))

	for i, column := range columns {
		dbType := columnTypes[i].DatabaseTypeName()

		mappedType := r.ColumnMappedFormat(dbType)
		if length, ok := columnTypes[i].Length(); ok && strings.EqualFold(dbType, "TINYINT") && length == 1 {
			mappedType = MappedTypeBoolean
		}

		columnMappedTypes[column] = mappedType
		structures = append(structures, dto.Column{
			Name:       column,
			Type:       strings.ToLower(dbType),
			MappedType: mappedType,
			IsActive:   true,
		})
	}

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
		queryResults[i]["editable"] = false
		queryResults[i] = SanitizeQueryResultsWithTypes(queryResults[i], columnMappedTypes)
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
