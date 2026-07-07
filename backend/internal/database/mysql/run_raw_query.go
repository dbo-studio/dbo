package databaseMysql

import (
	"context"
	"fmt"
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

type mysqlRawQueryResolver struct {
	repo *MySQLRepository
}

func (r *MySQLRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	resp, err := r.base.RunRawQuery(ctx, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, &mysqlRawQueryResolver{repo: r})
}

func (r *mysqlRawQueryResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
	tables, err := r.repo.ListTableNames(ctx, database, schema)
	if err != nil {
		return false, err
	}

	if !slices.Contains(tables, table) {
		return false, nil
	}

	views, err := r.repo.ListViewNames(ctx, database, schema)
	if err != nil {
		return false, err
	}

	return !slices.Contains(views, table), nil
}

func (r *mysqlRawQueryResolver) LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error) {
	columns, err := r.repo.columns(ctx, database, lo.ToPtr(table), nil, true, true)
	if err != nil {
		return nil, err
	}

	return columnListToResponse(columns), nil
}

func (r *mysqlRawQueryResolver) BuildNodeID(database, schema, table string) string {
	_ = schema
	return fmt.Sprintf("%s.%s", database, table)
}
