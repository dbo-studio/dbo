package databasePostgres

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

func (r *PostgresRepository) AutoComplete(ctx context.Context, data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	g, gctx := errgroup.WithContext(ctx)

	var databases []Database
	var views []View
	var schemas []Schema
	var tables []Table

	g.Go(func() error {
		result, err := r.databases(gctx, true)
		if err != nil {
			return err
		}
		databases = result
		return nil
	})

	g.Go(func() error {
		var err error
		if data.Database != nil && data.Schema != nil {
			views, err = r.views(gctx, data.Database, data.Schema, true)
		} else {
			views, err = r.views(gctx, nil, nil, true)
		}
		return err
	})

	g.Go(func() error {
		result, err := r.schemas(gctx, data.Database, true)
		if err != nil {
			return err
		}
		schemas = result
		return nil
	})

	g.Go(func() error {
		var err error
		if data.Schema != nil {
			tables, err = r.tables(gctx, data.Schema, true)
		} else {
			tables, err = r.tables(gctx, nil, true)
		}
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	columns := make(map[string][]string)

	if data.Schema != nil {
		gColumns, gColumnsCtx := errgroup.WithContext(ctx)
		var columnMap sync.Map

		for _, table := range tables {
			tableName := table.Name
			gColumns.Go(func() error {
				columnResult, err := r.columns(gColumnsCtx, &tableName, data.Schema, nil, false, true)
				if err != nil {
					return err
				}
				columnMap.Store(tableName, lo.Map(columnResult, func(x Column, _ int) string { return x.ColumnName }))
				return nil
			})
		}

		if err := gColumns.Wait(); err != nil {
			return nil, err
		}

		columnMap.Range(func(key, value any) bool {
			tableName, ok := key.(string)
			if !ok {
				return true
			}
			if columnList, ok := value.([]string); ok {
				columns[tableName] = columnList
			}
			return true
		})
	}

	return &dto.AutoCompleteResponse{
		Databases: lo.Map(databases, func(x Database, _ int) string { return x.Name }),
		Views:     lo.Map(views, func(x View, _ int) string { return x.Name }),
		Schemas:   lo.Map(schemas, func(x Schema, _ int) string { return x.Name }),
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}
