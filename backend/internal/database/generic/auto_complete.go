package databaseGeneric

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

const autocompleteConcurrency = 6

func (r *Repository) AutoComplete(ctx context.Context, _ *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	tables, err := r.ListTableNames(ctx, nil, nil)
	if err != nil {
		return nil, err
	}

	views, err := r.ListViewNames(ctx, nil, nil)
	if err != nil {
		return nil, err
	}

	ns, err := r.resolveNamespace(ctx, nil, nil)
	if err != nil {
		return nil, err
	}

	var (
		mu      sync.Mutex
		columns = make(map[string][]string, len(tables))
	)

	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(autocompleteConcurrency)

	for _, table := range tables {
		g.Go(func() error {
			cols, err := r.d.Columns(gctx, r.base.DB().WithContext(gctx), ns, table)
			if err != nil {
				return err
			}

			mu.Lock()
			columns[table] = lo.Map(cols, func(c ColumnInfo, _ int) string { return c.Name })
			mu.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &dto.AutoCompleteResponse{Databases: []string{}, Schemas: []string{}, Views: views, Tables: tables, Columns: columns}, nil
}
