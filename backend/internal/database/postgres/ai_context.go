package databasePostgres

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

type ForeignKeyInfo struct {
	ReferencedTable  string
	ReferencedColumn string
}

/*
this is a sample of the AI context
Database: default
Schema: public

Tables:
1. data_src
  - datasrc_id (PK, character)
  - authors (character varying)
  - title (character varying)
  - year (integer)
  - journal (text)
  - vol_city (text)
  - issue_state (text)
  - start_page (text)
  - end_page (text)

2. datsrcln
  - ndb_no (PK, FK → nut_data.nutr_no, character)
  - nutr_no (PK, FK → nut_data.nutr_no, character)
  - datasrc_id (PK, FK → data_src.datasrc_id, character)
*/
func (r *PostgresRepository) AiContext(ctx context.Context, req *dto.AiChatRequest) (string, error) {
	if req.ContextOpts == nil {
		return "", nil
	}

	tables := req.ContextOpts.Tables
	if len(tables) == 0 && lo.FromPtr(req.ContextOpts.ObjectDefinition) == "" {
		list, err := r.ListTableNames(ctx, req.ContextOpts.Schema)
		if err != nil {
			return "", err
		}
		tables = list
	}

	views := req.ContextOpts.Views
	if len(views) == 0 && lo.FromPtr(req.ContextOpts.ObjectDefinition) == "" {
		list, err := r.ListViewNames(ctx, req.ContextOpts.Schema)
		if err != nil {
			return "", err
		}
		views = list
	}

	return databaseCore.BuildAIChatContext(ctx, databaseContract.AIContextOptions{
		Database: req.ContextOpts.Database,
		Schema:   req.ContextOpts.Schema,
		Tables:   tables,
		Views:    views,
	}, postgresAIContextProvider{repo: r})
}

/*
this is a sample of the AI complete context
Database: default
Schema: public

Tables:
1. data_src
  - datasrc_id (PK, character(6))
  - authors (character varying(256))
  - title (character varying)
  - year (integer)
  - journal (text)
  - vol_city (text)
  - issue_state (text)
  - start_page (text)
  - end_page (text)
*/
func (r *PostgresRepository) AiCompleteContext(ctx context.Context, req *dto.AiInlineCompleteRequest) string {
	sqlResult := r.base.ParseSQL(req.ContextOpts.Prompt)
	database := sqlResult.Database
	if database == nil {
		database = req.ContextOpts.Database
	}
	schema := sqlResult.Schema
	if schema == nil {
		schema = req.ContextOpts.Schema
	}

	result, err := databaseCore.BuildAICompleteContext(ctx, databaseContract.AIContextOptions{
		Database: database,
		Schema:   schema,
		Tables:   sqlResult.Tables,
		Views:    sqlResult.Views,
	}, postgresAIContextProvider{repo: r})
	if err != nil {
		return ""
	}
	return result
}

type postgresAIContextProvider struct {
	repo *PostgresRepository
}

func (p postgresAIContextProvider) TableColumns(ctx context.Context, table string, opts databaseContract.AIContextOptions) ([]databaseContract.AIContextColumn, error) {
	columns, err := p.repo.columns(ctx, &table, opts.Schema, []string{}, false, true)
	if err != nil {
		return nil, err
	}
	return postgresColumnsToContextColumns(columns), nil
}

func (p postgresAIContextProvider) ViewColumns(ctx context.Context, view string, opts databaseContract.AIContextOptions) ([]databaseContract.AIContextColumn, error) {
	columns, err := p.repo.columns(ctx, &view, opts.Schema, []string{}, false, true)
	if err != nil {
		return nil, err
	}
	return postgresColumnsToContextColumns(columns), nil
}

func postgresColumnsToContextColumns(columns []Column) []databaseContract.AIContextColumn {
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
