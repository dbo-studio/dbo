package databasePostgres

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *PostgresRepository) ListTableNames(ctx context.Context, database, schema *string) ([]string, error) {
	tableList, err := r.tables(ctx, database, schema, true)
	if err != nil {
		return nil, err
	}
	return lo.Map(tableList, func(table Table, _ int) string {
		return table.Name
	}), nil
}

func (r *PostgresRepository) ListViewNames(ctx context.Context, database, schema *string) ([]string, error) {
	viewList, err := r.views(ctx, database, schema, true)
	if err != nil {
		return nil, err
	}
	return lo.Map(viewList, func(view View, _ int) string {
		return view.Name
	}), nil
}

func (r *PostgresRepository) DescribeTable(ctx context.Context, table string, database, schema *string) (string, error) {
	return r.AiContext(ctx, &dto.AiChatRequest{
		ContextOpts: &dto.AiContextOptions{
			Database: database,
			Schema:   schema,
			Tables:   []string{table},
		},
	})
}
