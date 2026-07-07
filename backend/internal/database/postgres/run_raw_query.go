package databasePostgres

import (
	"context"
	"fmt"
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

type postgresRawQueryResolver struct {
	repo *PostgresRepository
}

func (r *PostgresRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	resp, err := r.base.RunRawQuery(ctx, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, &postgresRawQueryResolver{repo: r})
}

func (r *postgresRawQueryResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
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

func (r *postgresRawQueryResolver) LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error) {
	columns, err := r.repo.columns(ctx, database, lo.ToPtr(table), schema, nil, true, true)
	if err != nil {
		return nil, err
	}

	return columnListToResponse(columns), nil
}

func (r *postgresRawQueryResolver) BuildNodeID(database, schema, table string) string {
	return fmt.Sprintf("%s.%s.%s", database, schema, table)
}
