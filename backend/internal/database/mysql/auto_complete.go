package databaseMysql

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

func (r *MySQLRepository) AutoComplete(ctx context.Context, data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	g, gctx := errgroup.WithContext(ctx)

	var databases []Database
	var views []View
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
		if data.Database != nil {
			views, err = r.views(gctx, data.Database, true)
		} else {
			views, err = r.views(gctx, nil, true)
		}
		return err
	})

	g.Go(func() error {
		var err error
		if data.Database != nil {
			tables, err = r.tables(gctx, data.Database, true)
		} else {
			tables, err = r.tables(gctx, nil, true)
		}
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	columns := make(map[string][]string)

	if data.Database != nil {
		gColumns, gColumnsCtx := errgroup.WithContext(ctx)
		var columnMap sync.Map

		for _, table := range tables {
			tableName := table.Name
			databaseName := lo.FromPtr(data.Database)
			gColumns.Go(func() error {
				columnResult, err := r.columns(gColumnsCtx, &databaseName, &tableName, nil, false, true)
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
		Schemas:   []string{},
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}
