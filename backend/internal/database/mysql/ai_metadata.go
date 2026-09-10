package databaseMysql

import (
	"context"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
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

	input := &databaseContract.AIContextInput{
		Tables: []string{table},
	}
	if database != nil {
		input.Database = database
	}

	return r.AiContext(ctx, input)
}
