package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

func (r *Repository) AiContext(ctx context.Context, req *contract.AIContextInput) (string, error) {
	if req == nil {
		return "", nil
	}

	tables, views := req.Tables, req.Views

	if len(tables) == 0 && len(views) == 0 && lo.FromPtr(req.ObjectDefinition) == "" {
		var err error

		if tables, err = r.ListTableNames(ctx, req.Database, req.Schema); err != nil {
			return "", err
		}

		if views, err = r.ListViewNames(ctx, req.Database, req.Schema); err != nil {
			return "", err
		}
	}

	return databaseCore.BuildAIChatContext(ctx, contract.AIContextOptions{Database: req.Database, Schema: req.Schema, Tables: tables, Views: views}, columnProvider{r})
}

func (r *Repository) AiCompleteContext(ctx context.Context, req *contract.AICompleteInput) string {
	if req == nil {
		return ""
	}

	parsed := r.base.ParseSQL(req.Prompt)
	database, schema := lo.Ternary(parsed.Database != nil, parsed.Database, req.Database), lo.Ternary(parsed.Schema != nil, parsed.Schema, req.Schema)

	out, err := databaseCore.BuildAICompleteContext(ctx, contract.AIContextOptions{Database: database, Schema: schema, Tables: parsed.Tables, Views: parsed.Views}, columnProvider{r})
	if err != nil {
		return ""
	}

	return out
}

type columnProvider struct{ r *Repository }

func (p columnProvider) columns(ctx context.Context, name string, opts contract.AIContextOptions) ([]contract.AIContextColumn, error) {
	ns, err := p.r.resolveNamespace(ctx, opts.Database, opts.Schema)
	if err != nil {
		return nil, err
	}

	columns, err := p.r.d.Columns(ctx, p.r.base.DB().WithContext(ctx), ns, name)
	if err != nil {
		return nil, err
	}

	return lo.Map(columns, func(c ColumnInfo, _ int) contract.AIContextColumn {
		return contract.AIContextColumn{Name: c.Name, MappedType: p.r.mapType(c.DataType), DataType: c.DataType, IsPrimaryKey: c.IsPrimaryKey}
	}), nil
}

func (p columnProvider) TableColumns(ctx context.Context, table string, opts contract.AIContextOptions) ([]contract.AIContextColumn, error) {
	return p.columns(ctx, table, opts)
}

func (p columnProvider) ViewColumns(ctx context.Context, view string, opts contract.AIContextOptions) ([]contract.AIContextColumn, error) {
	return p.columns(ctx, view, opts)
}
