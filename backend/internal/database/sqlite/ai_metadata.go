package databaseSqlite

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) ListTableNames(ctx context.Context, schema *string) ([]string, error) {
	_ = schema
	tableList, err := r.getAllTableList(ctx)
	if err != nil {
		return nil, err
	}
	return lo.Map(tableList, func(table Table, _ int) string {
		return table.Name
	}), nil
}

func (r *SQLiteRepository) ListViewNames(ctx context.Context, schema *string) ([]string, error) {
	_ = schema
	viewList, err := r.views(ctx)
	if err != nil {
		return nil, err
	}
	return lo.Map(viewList, func(view View, _ int) string {
		return view.Name
	}), nil
}

func (r *SQLiteRepository) DescribeTable(ctx context.Context, table string, schema *string) (string, error) {
	_ = schema
	return r.AiContext(ctx, &dto.AiChatRequest{
		ContextOpts: &dto.AiContextOptions{
			Tables: []string{table},
		},
	})
}
