package databaseSqlite

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
func (r *SQLiteRepository) AiContext(ctx context.Context, req *dto.AiChatRequest) (string, error) {
	if req.ContextOpts == nil {
		return "", nil
	}

	tables := req.ContextOpts.Tables
	if len(tables) == 0 {
		list, err := r.ListTableNames(ctx, nil)
		if err != nil {
			return "", err
		}
		tables = list
	}

	views := req.ContextOpts.Views
	if len(views) == 0 {
		list, err := r.ListViewNames(ctx, nil)
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
	}, sqliteAIContextProvider{repo: r})
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
func (r *SQLiteRepository) AiCompleteContext(ctx context.Context, req *dto.AiInlineCompleteRequest) string {
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
