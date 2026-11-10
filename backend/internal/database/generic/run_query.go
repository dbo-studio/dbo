package databaseGeneric

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *Repository) RunQuery(ctx context.Context, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	namespace, table := node(req.NodeID)
	if table == "" {
		return nil, errors.New("table or view not found")
	}

	db := r.base.DB().WithContext(ctx)

	columns, err := r.d.Columns(ctx, db, namespace, table)
	if err != nil {
		return nil, err
	}

	if len(columns) == 0 {
		return nil, apperror.NotFound(fmt.Errorf("table or view %q not found in %q", table, namespace))
	}

	// A view lists the same columns as a table but is never editable from the grid.
	editable := r.d.Editable()
	if editable {
		views, err := r.d.Views(ctx, db, namespace)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		editable = !lo.Contains(views, table)
	}

	query := r.selectQuery(req, namespace, table, columns)
	rows := make([]map[string]any, 0)

	if err := db.Raw(query).Find(&rows).Error; err != nil {
		return nil, err
	}

	mapped := make(map[string]string, len(columns))
	for _, c := range columns {
		mapped[c.Name] = r.mapType(c.DataType)
	}

	for i := range rows {
		rows[i] = databaseCore.SanitizeQueryResultsWithTypes(rows[i], mapped)
		rows[i]["dbo_index"] = i
	}

	return &dto.RunQueryResponse{
		Query:   query,
		Columns: r.columnsToResponse(ctx, namespace, table, columns, req.Columns, editable),
		Data:    rows,
	}, nil
}

func (r *Repository) selectQuery(req *dto.RunQueryRequest, namespace, table string, columns []ColumnInfo) string {
	selected := "*"
	if len(req.Columns) > 0 {
		selected = strings.Join(lo.Map(req.Columns, func(c string, _ int) string { return r.d.Quote(c) }), ", ")
	}

	var sb strings.Builder

	_, _ = fmt.Fprintf(&sb, "SELECT %s FROM %s", selected, r.qualified(namespace, table))

	if len(req.Filters) > 0 {
		sb.WriteString(" WHERE ")

		for i, f := range req.Filters {
			column := r.d.Quote(f.Column)
			if dto.FilterIsLikeOperator(f.Operator) {
				column = r.d.CastText(column)
			}

			_, _ = fmt.Fprintf(&sb, "%s %s", column, dto.FilterPredicate(f.Operator, f.Value))

			if i < len(req.Filters)-1 {
				_, _ = fmt.Fprintf(&sb, " %s ", f.Next)
			}
		}
	}

	order := ""

	switch {
	case len(req.Sorts) > 0:
		order = strings.Join(lo.Map(req.Sorts, func(s dto.SortDto, _ int) string {
			return fmt.Sprintf("%s %s", r.d.Quote(s.Column), s.Operator)
		}), ", ")
	default:
		order = strings.Join(lo.FilterMap(columns, func(c ColumnInfo, _ int) (string, bool) {
			return r.d.Quote(c.Name), c.IsPrimaryKey
		}), ", ")
	}

	limit := 100
	if req.Limit != nil && *req.Limit > 0 {
		limit = *req.Limit
	}

	offset := 0
	if req.Page != nil && *req.Page > 0 {
		offset = (*req.Page - 1) * limit
	}

	return r.d.Paginate(sb.String(), order, limit, offset)
}

func (r *Repository) columnsToResponse(ctx context.Context, namespace, table string, columns []ColumnInfo, active []string, editable bool) []dto.Column {
	foreignKeys, _ := r.d.ForeignKeys(ctx, r.base.DB().WithContext(ctx), namespace, table)

	return lo.Map(columns, func(c ColumnInfo, _ int) dto.Column {
		col := dto.Column{
			Name:         c.Name,
			Type:         c.DataType,
			MappedType:   r.mapType(c.DataType),
			NotNull:      c.NotNull,
			Default:      c.Default,
			Length:       c.Length,
			Editable:     editable && !c.Generated,
			IsActive:     len(active) == 0 || lo.Contains(active, c.Name),
			IsPrimaryKey: c.IsPrimaryKey,
		}

		for _, fk := range foreignKeys {
			if lo.Contains(fk.Columns, c.Name) {
				col.IsForeignKey = true
				col.ReferencedTable = lo.ToPtr(fk.RefTable)
				col.ReferencedSchema = lo.EmptyableToPtr(fk.RefSchema)
				col.ReferencedColumns = fk.RefColumns
				col.LocalColumns = fk.Columns

				break
			}
		}

		return col
	})
}
