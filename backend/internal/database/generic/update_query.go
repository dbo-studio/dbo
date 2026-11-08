package databaseGeneric

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (r *Repository) UpdateQuery(ctx context.Context, req *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error) {
	if !r.d.Editable() {
		return nil, apperror.Validation(fmt.Errorf("%s tables cannot be edited from the grid", r.base.Connection().ConnectionType))
	}

	namespace, table := node(req.NodeID)
	if table == "" {
		return nil, apperror.Validation(fmt.Errorf("invalid node: table missing"))
	}

	columns, err := r.d.Columns(ctx, r.base.DB().WithContext(ctx), namespace, table)
	if err != nil {
		return nil, err
	}

	target := r.qualified(namespace, table)
	keys := lo.FilterMap(columns, func(c ColumnInfo, _ int) (string, bool) { return c.Name, c.IsPrimaryKey })
	queries := make([]string, 0)

	for _, item := range req.EditedItems {
		set := r.setClauses(item.Values)

		where := r.whereClauses(keys, item.Conditions)
		if len(set) == 0 || len(where) == 0 {
			continue
		}

		queries = append(queries, fmt.Sprintf("UPDATE %s SET %s WHERE %s", target, strings.Join(set, ", "), strings.Join(where, " AND ")))
	}

	for _, item := range req.AddedItems {
		names, values := r.insertParts(item)
		if len(names) == 0 {
			continue
		}

		queries = append(queries, fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", target, strings.Join(names, ", "), strings.Join(values, ", ")))
	}

	for _, item := range req.DeletedItems {
		where := r.whereClauses(keys, item)
		if len(where) == 0 {
			continue
		}

		queries = append(queries, fmt.Sprintf("DELETE FROM %s WHERE %s", target, strings.Join(where, " AND ")))
	}

	rowsAffected := 0

	err = r.base.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, q := range queries {
			result := tx.Exec(q)
			if result.Error != nil {
				return result.Error
			}

			rowsAffected += int(result.RowsAffected)
		}

		return nil
	})
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return &dto.UpdateQueryResponse{Query: queries, RowsAffected: rowsAffected}, nil
}

// literal renders a JSON value as a SQL literal. Strings are N” so non-ASCII text survives varchar/nvarchar.
func literal(value any) string {
	switch v := value.(type) {
	case nil:
		return "NULL"
	case bool:
		return lo.Ternary(v, "1", "0")
	case string:
		return "N'" + strings.ReplaceAll(v, "'", "''") + "'"
	default:
		out, err := helper.FormatSQLValueForDriver("sqlserver", v)
		if err != nil {
			return "NULL"
		}

		return out
	}
}

func (r *Repository) setClauses(values map[string]any) []string {
	names := lo.Keys(values)
	sort.Strings(names)

	clauses := make([]string, 0, len(names))

	for _, name := range names {
		if name == "dbo_index" {
			continue
		}

		value := lo.Ternary(values[name] == "@DEFAULT", "DEFAULT", literal(values[name]))
		clauses = append(clauses, fmt.Sprintf("%s = %s", r.d.Quote(name), value))
	}

	return clauses
}

func (r *Repository) insertParts(item map[string]any) (names, values []string) {
	keys := lo.Keys(item)
	sort.Strings(keys)

	for _, key := range keys {
		if key == "dbo_index" || item[key] == "@DEFAULT" {
			continue
		}

		names = append(names, r.d.Quote(key))
		values = append(values, literal(item[key]))
	}

	return names, values
}

// whereClauses matches on the primary key when the row carries it, otherwise on every given column.
func (r *Repository) whereClauses(keys []string, conditions map[string]any) []string {
	match := map[string]any{}

	for _, key := range keys {
		if v, ok := conditions[key]; ok && v != nil {
			match[key] = v
		}
	}

	if len(match) == 0 {
		match = conditions
	}

	names := lo.Keys(match)
	sort.Strings(names)

	return lo.FilterMap(names, func(name string, _ int) (string, bool) {
		if name == "dbo_index" {
			return "", false
		}

		if match[name] == nil {
			return r.d.Quote(name) + " IS NULL", true
		}

		return fmt.Sprintf("%s = %s", r.d.Quote(name), literal(match[name])), true
	})
}
