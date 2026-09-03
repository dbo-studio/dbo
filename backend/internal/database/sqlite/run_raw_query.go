package databaseSqlite

import (
	"context"

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

	var typ string

	err := r.repo.base.DB().WithContext(ctx).
		Table("sqlite_master").
		Select("type").
		Where("name = ? AND type IN ('table', 'view')", table).
		Where("name NOT LIKE 'sqlite_%'").
		Limit(1).
		Scan(&typ).Error
	if err != nil {
		return false, err
	}

	return typ == "table", nil
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
