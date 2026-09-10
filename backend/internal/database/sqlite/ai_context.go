package databaseSqlite

import (
	"context"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

const maxAIContextObjects = 25

type ForeignKeyInfo struct {
	ReferencedTable  string
	ReferencedColumn string
}

func (r *SQLiteRepository) AiContext(ctx context.Context, req *databaseContract.AIContextInput) (string, error) {
	if req == nil {
		return "", nil
	}

	tables := req.Tables
	if len(tables) == 0 && lo.FromPtr(req.ObjectDefinition) == "" {
		list, err := r.ListTableNames(ctx, nil, nil)
		if err != nil {
			return "", err
		}

		tables = list
		if len(tables) > maxAIContextObjects {
			tables = tables[:maxAIContextObjects]
		}
	}

	views := req.Views
	if len(views) == 0 && lo.FromPtr(req.ObjectDefinition) == "" {
		list, err := r.ListViewNames(ctx, nil, nil)
		if err != nil {
			return "", err
		}

		views = list
		if len(views) > maxAIContextObjects {
			views = views[:maxAIContextObjects]
		}
	}

	return databaseCore.BuildAIChatContext(ctx, databaseContract.AIContextOptions{
		Database: req.Database,
		Schema:   req.Schema,
		Tables:   tables,
		Views:    views,
	}, sqliteAIContextProvider{repo: r})
}

func (r *SQLiteRepository) AiCompleteContext(ctx context.Context, req *databaseContract.AICompleteInput) string {
	if req == nil {
		return ""
	}

	sqlResult := r.base.ParseSQL(req.Prompt)

	database := sqlResult.Database
	if database == nil {
		database = req.Database
	}

	schema := sqlResult.Schema
	if schema == nil {
		schema = req.Schema
	}

	result, err := databaseCore.BuildAICompleteContext(ctx, databaseContract.AIContextOptions{
		Database: database,
		Schema:   schema,
		Tables:   sqlResult.Tables,
		Views:    sqlResult.Views,
	}, sqliteAIContextProvider{repo: r})
	if err != nil {
		return ""
	}

	return result
}

type sqliteAIContextProvider struct {
	repo *SQLiteRepository
}

func (p sqliteAIContextProvider) TableColumns(ctx context.Context, table string, _ databaseContract.AIContextOptions) ([]databaseContract.AIContextColumn, error) {
	columns, err := p.repo.getColumns(ctx, table, []string{}, false)
	if err != nil {
		return nil, err
	}

	return sqliteColumnsToContextColumns(columns), nil
}

func (p sqliteAIContextProvider) ViewColumns(ctx context.Context, view string, _ databaseContract.AIContextOptions) ([]databaseContract.AIContextColumn, error) {
	columns, err := p.repo.getColumns(ctx, view, []string{}, false)
	if err != nil {
		return nil, err
	}

	return sqliteColumnsToContextColumns(columns), nil
}

func sqliteColumnsToContextColumns(columns []Column) []databaseContract.AIContextColumn {
	return lo.Map(columns, func(column Column, _ int) databaseContract.AIContextColumn {
		return databaseContract.AIContextColumn{
			Name:         column.ColumnName,
			MappedType:   column.MappedType,
			DataType:     column.DataType,
			IsPrimaryKey: column.IsPrimaryKey == "1",
		}
	})
}
