package databaseMysql

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *MySQLRepository) ListTableNames(ctx context.Context, database, schema *string) ([]string, error) {
	_ = schema

	tableList, err := r.tables(ctx, database, true)
	if err != nil {
		return nil, err
	}

	return lo.Map(tableList, func(table Table, _ int) string {
		return table.Name
	}), nil
}

func (r *MySQLRepository) ListViewNames(ctx context.Context, database, schema *string) ([]string, error) {
	_ = schema

	viewList, err := r.views(ctx, database, true)
	if err != nil {
		return nil, err
	}

	return lo.Map(viewList, func(view View, _ int) string {
		return view.Name
	}), nil
}

func (r *MySQLRepository) DescribeTable(ctx context.Context, table string, database, schema *string) (string, error) {
	_ = schema

	opts := &dto.AiContextOptions{
		Tables: []string{table},
	}
	if database != nil {
		opts.Database = database
	}

	return r.AiContext(ctx, &dto.AiChatRequest{ContextOpts: opts})
}
