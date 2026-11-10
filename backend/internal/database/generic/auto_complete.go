package databaseGeneric

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

const autocompleteConcurrency = 6

func (r *Repository) AutoComplete(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	tables, err := r.ListTableNames(ctx, req.Database, req.Schema)
	if err != nil {
		return nil, err
	}

	views, err := r.ListViewNames(ctx, req.Database, req.Schema)
	if err != nil {
		return nil, err
	}

	ns, err := r.resolveNamespace(ctx, req.Database, req.Schema)
	if err != nil {
		return nil, err
	}

	namespaces, err := r.d.Namespaces(ctx, r.base.DB().WithContext(ctx))
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

	// A namespace is a schema (SQL Server) or a database (ClickHouse); the editor shows the matching picker.
	resp := &dto.AutoCompleteResponse{Databases: []string{}, Schemas: []string{}, Views: views, Tables: tables, Columns: columns}
	if r.d.NamespaceIsSchema() {
		resp.Schemas = namespaces
	} else {
		resp.Databases = namespaces
	}

	return resp, nil
}
