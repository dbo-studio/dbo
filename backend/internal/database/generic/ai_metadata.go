package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *Repository) resolveNamespace(ctx context.Context, database, schema *string) (string, error) {
	if ns := r.namespaceOf(database, schema); ns != "" {
		return ns, nil
	}

	return r.d.DefaultNamespace(ctx, r.base.DB().WithContext(ctx))
}

func (r *Repository) ListTableNames(ctx context.Context, database, schema *string) ([]string, error) {
	ns, err := r.resolveNamespace(ctx, database, schema)
	if err != nil {
		return nil, err
	}

	return r.d.Tables(ctx, r.base.DB().WithContext(ctx), ns)
}

func (r *Repository) ListViewNames(ctx context.Context, database, schema *string) ([]string, error) {
	ns, err := r.resolveNamespace(ctx, database, schema)
	if err != nil {
		return nil, err
	}

	return r.d.Views(ctx, r.base.DB().WithContext(ctx), ns)
}

func (r *Repository) DescribeTable(ctx context.Context, table string, database, schema *string) (string, error) {
	return r.AiContext(ctx, &contract.AIContextInput{Database: database, Schema: schema, Tables: []string{table}})
}
