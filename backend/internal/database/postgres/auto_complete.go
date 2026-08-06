package databasePostgres

import (
	"context"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

const autocompleteConcurrency = 6

func (r *PostgresRepository) AutoComplete(ctx context.Context, data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	g, gctx := errgroup.WithContext(ctx)

	var databases []Database
	var views []View
	var schemas []Schema
	var tables []Table

	g.Go(func() error {
		if configured := databaseConnection.DefaultPostgresqlDatabase(r.base.Connection()); configured != "" {
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
		if data.Database != nil && data.Schema != nil {
			views, err = r.viewsLite(gctx, data.Database, data.Schema, true)
		} else {
			views, err = r.viewsLite(gctx, nil, nil, true)
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
			tables, err = r.tables(gctx, data.Database, data.Schema, true)
		} else {
			tables, err = r.tables(gctx, data.Database, nil, true)
		}
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	columns, err := r.autoCompleteColumns(ctx, data, tables)
	if err != nil {
		return nil, err
	}

	return &dto.AutoCompleteResponse{
		Databases: lo.Map(databases, func(x Database, _ int) string { return x.Name }),
		Views:     lo.Map(views, func(x View, _ int) string { return x.Name }),
		Schemas:   lo.Map(schemas, func(x Schema, _ int) string { return x.Name }),
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}

func (r *PostgresRepository) autoCompleteColumns(ctx context.Context, data *dto.AutoCompleteRequest, tables []Table) (map[string][]string, error) {
	if len(tables) == 0 {
		return map[string][]string{}, nil
	}

	batched, err := r.columnsLiteBatch(ctx, data.Database, data.Schema)
	if err == nil && len(batched) > 0 {
		out := make(map[string][]string, len(tables))
		for _, table := range tables {
			if cols, ok := batched[table.Name]; ok {
				out[table.Name] = cols
			} else {
				out[table.Name] = []string{}
			}
		}
		return out, nil
	}

	gColumns, gColumnsCtx := errgroup.WithContext(ctx)
	gColumns.SetLimit(autocompleteConcurrency)
	var columnMap sync.Map

	for _, table := range tables {
		tableName := table.Name
		gColumns.Go(func() error {
			columnResult, err := r.columnsLite(gColumnsCtx, data.Database, &tableName, data.Schema, true)
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

	columns := make(map[string][]string)
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

	return columns, nil
}
