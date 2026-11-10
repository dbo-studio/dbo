package databaseClickhouse

import (
	"context"
	"errors"
	"regexp"
	"strings"

	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

var orderByClause = regexp.MustCompile(`(?is)\bORDER BY\s+(.*?)\s+(?:POPULATE\s+)?AS\b`)

var toClause = regexp.MustCompile("(?is)\\bMATERIALIZED\\s+VIEW\\s+\\S+\\s+TO\\s+(`?[\\w.]+`?(?:\\.`?\\w+`?)?)")

func (clickhouse) MaterializedViews(_ context.Context, db *gorm.DB, ns string) ([]string, error) {
	var names []string

	err := db.Raw(`SELECT name FROM system.tables WHERE database = ? AND engine = 'MaterializedView' ORDER BY name`, ns).Scan(&names).Error

	return names, err
}

func (clickhouse) MaterializedViewRow(_ context.Context, db *gorm.DB, ns, name string) (map[string]any, error) {
	var row struct{ AsSelect, CreateTableQuery string }

	if err := db.Raw(`SELECT as_select, create_table_query FROM system.tables WHERE database = ? AND name = ?`, ns, name).Scan(&row).Error; err != nil {
		return nil, err
	}

	target := ""
	if m := toClause.FindStringSubmatch(row.CreateTableQuery); m != nil {
		target = strings.ReplaceAll(m[1], "`", "")
	}

	return map[string]any{"name": name, "target": target, "order_by": lo.Ternary(target == "", innerOrderBy(row.CreateTableQuery), ""), "query": row.AsSelect}, nil
}

func (c clickhouse) CreateMaterializedView(ns string, s generic.MaterializedViewSpec) (string, error) {
	if err := storageExpression("ORDER BY", s.OrderBy); err != nil {
		return "", err
	}

	sql := "CREATE MATERIALIZED VIEW " + c.table(ns, s.Name)

	if s.Target != "" {
		sql += " TO " + c.targetTable(ns, s.Target)
	} else {
		sql += " ENGINE = MergeTree ORDER BY " + lo.Ternary(s.OrderBy == "", "tuple()", s.OrderBy)
	}

	return sql + " AS " + s.Query, nil
}

// targetTable quotes `table` in the view's database, or `database.table` as given.
func (c clickhouse) targetTable(ns, target string) string {
	db, table, found := strings.Cut(target, ".")
	if !found {
		return c.table(ns, target)
	}

	return c.table(db, table)
}

func (c clickhouse) AlterMaterializedView(ns string, old, next generic.MaterializedViewSpec) ([]string, error) {
	var statements []string

	current := old.Name

	if old.Name != next.Name {
		statements = append(statements, c.RenameTable(ns, old.Name, next.Name))
		current = next.Name
	}

	if old.Target == next.Target && old.OrderBy == next.OrderBy && strings.TrimSpace(old.Query) == next.Query {
		return statements, nil
	}

	// A view with an inner table keeps its rows there: re-creating it would throw them away.
	if old.Target == "" || next.Target == "" {
		return nil, errors.New("a materialized view with its own inner table cannot change its query or target: drop it and create it again")
	}

	next.Name = current

	create, err := c.CreateMaterializedView(ns, next)
	if err != nil {
		return nil, err
	}

	return append(statements, c.DropView(ns, current), create), nil
}

func (c clickhouse) DropMaterializedView(ns, name string) string { return c.DropView(ns, name) }

// innerOrderBy is the ORDER BY of the inner table, without the SETTINGS the server appends.
func innerOrderBy(createQuery string) string {
	order := firstGroup(orderByClause, createQuery)
	if i := strings.Index(strings.ToUpper(order), " SETTINGS "); i >= 0 {
		order = order[:i]
	}

	return strings.TrimSpace(order)
}
