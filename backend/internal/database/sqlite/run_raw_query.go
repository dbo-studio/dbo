package databaseSqlite

import (
	"context"
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
)

type sqliteRawQueryResolver struct {
	repo *SQLiteRepository
}

func (r *SQLiteRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	resp, err := r.base.RunRawQuery(ctx, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, &sqliteRawQueryResolver{repo: r})
}

func (r *sqliteRawQueryResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
	_ = database
	_ = schema

	tables, err := r.repo.ListTableNames(ctx, nil, nil)
	if err != nil {
		return false, err
	}

	if !slices.Contains(tables, table) {
		return false, nil
	}

	views, err := r.repo.ListViewNames(ctx, nil, nil)
	if err != nil {
		return false, err
	}

	return !slices.Contains(views, table), nil
}

func (r *sqliteRawQueryResolver) LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error) {
	_ = database
	_ = schema

	columns, err := r.repo.getColumns(ctx, table, nil, true)
	if err != nil {
		return nil, err
	}

	return columnListToResponse(columns), nil
}

func (r *sqliteRawQueryResolver) BuildNodeID(_ context.Context, database, schema, table string) string {
	_ = database
	_ = schema
	return table
}
