package databaseSqlite

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

func (r *SQLiteRepository) AutoComplete(ctx context.Context, req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	g, _ := errgroup.WithContext(ctx)

	var views []ViewBasic
	var tables []Table

	g.Go(func() error {
		result, err := r.getAllViewList()
		if err != nil {
			return err
		}
		views = result
		return nil
	})

	g.Go(func() error {
		result, err := r.getAllTableList()
		if err != nil {
			return err
		}
		tables = result
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	columns := make(map[string][]string)

	if len(tables) > 0 {
		gColumns, _ := errgroup.WithContext(ctx)
		var columnMap sync.Map

		for _, table := range tables {
			tableName := table.Name
			gColumns.Go(func() error {
				columnResult, err := r.getColumns(tableName, nil, false)
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
		Databases: []string{},
		Views:     lo.Map(views, func(x ViewBasic, _ int) string { return x.Name }),
		Schemas:   []string{},
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}
