package databaseMysql

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

const autocompleteConcurrency = 6

func (r *MySQLRepository) AutoComplete(ctx context.Context, data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	g, gctx := errgroup.WithContext(ctx)

	var databases []Database
	var views []View
	var tables []Table

	g.Go(func() error {
		if configured := databaseConnection.DefaultMysqlDatabase(r.base.Connection()); configured != "" {
			databases = []Database{{Name: configured}}
			return nil
		}

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

	if data.Database != nil && len(tables) > 0 {
		batched, err := r.columnsLiteBatch(ctx, data.Database)
		if err == nil && len(batched) > 0 {
			for _, table := range tables {
				if cols, ok := batched[table.Name]; ok {
					columns[table.Name] = cols
				} else {
					columns[table.Name] = []string{}
				}
			}
		} else {
			gColumns, gColumnsCtx := errgroup.WithContext(ctx)
			gColumns.SetLimit(autocompleteConcurrency)
			var columnMap sync.Map

			for _, table := range tables {
				tableName := table.Name
				databaseName := lo.FromPtr(data.Database)
				gColumns.Go(func() error {
					columnResult, err := r.columnsLite(gColumnsCtx, &databaseName, &tableName, true)
					if err != nil {
						return err
					}
					columnMap.Store(tableName, columnResult)
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
	}

	return &dto.AutoCompleteResponse{
		Databases: lo.Map(databases, func(x Database, _ int) string { return x.Name }),
		Views:     lo.Map(views, func(x View, _ int) string { return x.Name }),
		Schemas:   []string{},
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}
