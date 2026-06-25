package databaseMysql

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *MySQLRepository) ListTableNames(ctx context.Context, schema *string) ([]string, error) {
	tableList, err := r.tables(ctx, schema, true)
	if err != nil {
		return nil, err
	}
	return lo.Map(tableList, func(table Table, _ int) string {
		return table.Name
	}), nil
}

func (r *MySQLRepository) ListViewNames(ctx context.Context, schema *string) ([]string, error) {
	viewList, err := r.views(ctx, schema, true)
	if err != nil {
		return nil, err
	}
	return lo.Map(viewList, func(view View, _ int) string {
		return view.Name
	}), nil
}

func (r *MySQLRepository) DescribeTable(ctx context.Context, table string, schema *string) (string, error) {
	opts := &dto.AiContextOptions{
		Tables: []string{table},
	}
	if schema != nil {
		opts.Database = schema
	}
	return r.AiContext(ctx, &dto.AiChatRequest{ContextOpts: opts})
}
