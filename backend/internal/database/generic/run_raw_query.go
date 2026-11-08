package databaseGeneric

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

func (r *Repository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	if !r.d.ReturnsRows(req.Query) {
		start := time.Now()
		err := r.base.DB().WithContext(ctx).Exec(req.Query).Error

		return r.base.CommandResponseBuilder(&dto.RawQueryResponse{Query: req.Query}, time.Since(start), err), nil
	}

	resp, err := r.base.RunRawQuery(ctx, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, rawResolver{r})
}

func (r *Repository) StreamRawQuery(ctx context.Context, req *dto.RawQueryRequest, chunkSize int, fn func(columns []dto.Column, rows []map[string]any) error) error {
	return r.base.StreamRawQuery(ctx, req, chunkSize, fn)
}

type rawResolver struct{ r *Repository }

func (x rawResolver) namespace(ctx context.Context, database, schema *string) string {
	if ns := x.r.namespaceOf(database, schema); ns != "" {
		return ns
	}

	ns, _ := x.r.d.DefaultNamespace(ctx, x.r.base.DB().WithContext(ctx))

	return ns
}

func (x rawResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
	if !x.r.d.Editable() {
		return false, nil
	}

	tables, err := x.r.d.Tables(ctx, x.r.base.DB().WithContext(ctx), x.namespace(ctx, database, schema))

	return lo.Contains(tables, table), err
}

func (x rawResolver) LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error) {
	ns := x.namespace(ctx, database, schema)

	columns, err := x.r.d.Columns(ctx, x.r.base.DB().WithContext(ctx), ns, table)
	if err != nil {
		return nil, err
	}

	return x.r.columnsToResponse(ctx, ns, table, columns, nil, true), nil
}

func (x rawResolver) BuildNodeID(ctx context.Context, database, schema, table string) string {
	return nodeID(x.namespace(ctx, lo.EmptyableToPtr(database), lo.EmptyableToPtr(schema)), table)
}
