package databaseMysql

import (
	"context"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

const maxAIContextObjects = 25

func (r *MySQLRepository) AiContext(ctx context.Context, req *databaseContract.AIContextInput) (string, error) {
	if req == nil {
		return "", nil
	}

	tables := req.Tables
	if len(tables) == 0 && lo.FromPtr(req.ObjectDefinition) == "" {
		list, err := r.ListTableNames(ctx, req.Database, nil)
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
		list, err := r.ListViewNames(ctx, req.Database, nil)
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
		Tables:   tables,
		Views:    views,
	}, mysqlAIContextProvider{repo: r})
}

func (r *MySQLRepository) AiCompleteContext(ctx context.Context, req *databaseContract.AICompleteInput) string {
	if req == nil {
		return ""
	}

	sqlResult := r.base.ParseSQL(req.Prompt)

	database := sqlResult.Database
	if database == nil {
		database = req.Database
	}

	result, err := databaseCore.BuildAICompleteContext(ctx, databaseContract.AIContextOptions{
		Database: database,
		Schema:   sqlResult.Schema,
		Tables:   sqlResult.Tables,
		Views:    sqlResult.Views,
	}, mysqlAIContextProvider{repo: r})
	if err != nil {
		return ""
	}

	return result
}

type mysqlAIContextProvider struct {
	repo *MySQLRepository
}

func (p mysqlAIContextProvider) TableColumns(ctx context.Context, table string, opts databaseContract.AIContextOptions) ([]databaseContract.AIContextColumn, error) {
	database := lo.FromPtr(opts.Database)

	columns, err := p.repo.columns(ctx, &database, &table, []string{}, false, true)
	if err != nil {
		return nil, err
	}

	return mysqlColumnsToContextColumns(columns), nil
}

func (p mysqlAIContextProvider) ViewColumns(ctx context.Context, view string, opts databaseContract.AIContextOptions) ([]databaseContract.AIContextColumn, error) {
	database := lo.FromPtr(opts.Database)

	columns, err := p.repo.columns(ctx, &database, &view, []string{}, false, true)
	if err != nil {
		return nil, err
	}

	return mysqlColumnsToContextColumns(columns), nil
}

func mysqlColumnsToContextColumns(columns []Column) []databaseContract.AIContextColumn {
	return lo.Map(columns, func(column Column, _ int) databaseContract.AIContextColumn {
		var fk *databaseContract.AIContextForeignKey
		if column.ForeignKey != nil {
			fk = &databaseContract.AIContextForeignKey{
				TargetTable: column.ForeignKey.TargetTable,
				Columns:     append([]string(nil), column.ForeignKey.ColumnsList...),
				RefColumns:  append([]string(nil), column.ForeignKey.RefColumnsList...),
				RefColumn:   column.ForeignKey.RefColumns,
			}
		}

		return databaseContract.AIContextColumn{
			Name:         column.ColumnName,
			MappedType:   column.MappedType,
			DataType:     column.DataType,
			IsPrimaryKey: column.IsPrimaryKey,
			ForeignKey:   fk,
		}
	})
}
