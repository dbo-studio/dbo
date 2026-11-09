package databaseClickhouse

import (
	"context"
	"fmt"
	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (clickhouse) ColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "data_type", Name: "Data Type (e.g. Nullable(String), Decimal(12, 2))", Type: contract.FormFieldTypeText, Required: true},
		{ID: "primary", Name: "Sorting key", Type: contract.FormFieldTypeCheckBox},
		{ID: "column_default", Name: "Default", Type: contract.FormFieldTypeText},
	}
}

func (clickhouse) ColumnRow(c generic.ColumnInfo) map[string]any {
	return map[string]any{
		"column_name":    c.Name,
		"data_type":      c.DataType,
		"primary":        c.IsPrimaryKey,
		"column_default": lo.FromPtr(c.Default),
	}
}

func (clickhouse) ColumnSpec(d *dto.MysqlTableColumnData) (generic.ColSpec, error) {
	if err := generic.RequireName(d); err != nil {
		return generic.ColSpec{}, err
	}

	typeText := strings.TrimSpace(*d.DataType)
	if !clickhouseTypePattern.MatchString(typeText) {
		return generic.ColSpec{}, fmt.Errorf("invalid data type %q", typeText)
	}

	return generic.NewColSpec(d, typeText), nil
}

func (c clickhouse) table(ns, table string) string { return c.Quote(ns) + "." + c.Quote(table) }

func (c clickhouse) CreateTable(ns, table string, cols []generic.ColSpec) string {
	defs := lo.Map(cols, func(col generic.ColSpec, _ int) string {
		return c.Quote(col.Name) + " " + col.Type + generic.SQLDefault(col.Default)
	})

	order := "tuple()"
	if pk := lo.FilterMap(cols, func(col generic.ColSpec, _ int) (string, bool) { return c.Quote(col.Name), col.Primary }); len(pk) > 0 {
		order = "(" + strings.Join(pk, ", ") + ")"
	}

	return "CREATE TABLE " + c.table(ns, table) + " (" + strings.Join(defs, ", ") + ") ENGINE = MergeTree ORDER BY " + order
}

func (c clickhouse) AddColumn(ns, table string, col generic.ColSpec) string {
	return "ALTER TABLE " + c.table(ns, table) + " ADD COLUMN " + c.Quote(col.Name) + " " + col.Type + generic.SQLDefault(col.Default)
}

func (c clickhouse) DropColumn(ns, table, column string) string {
	return "ALTER TABLE " + c.table(ns, table) + " DROP COLUMN " + c.Quote(column)
}

func (c clickhouse) ChangeColumn(ns, table string, old, next generic.ColSpec) ([]string, error) {
	var statements []string

	name := old.Name

	if old.Name != next.Name {
		statements = append(statements, "ALTER TABLE "+c.table(ns, table)+" RENAME COLUMN "+c.Quote(old.Name)+" TO "+c.Quote(next.Name))
		name = next.Name
	}

	if old.Type != next.Type || old.Default != next.Default {
		statements = append(statements, "ALTER TABLE "+c.table(ns, table)+" MODIFY COLUMN "+c.Quote(name)+" "+next.Type+generic.SQLDefault(next.Default))
	}

	return statements, nil
}

func (c clickhouse) RenameTable(ns, old, next string) string {
	return "RENAME TABLE " + c.table(ns, old) + " TO " + c.table(ns, next)
}

func (c clickhouse) CreateNamespace(name string) string { return "CREATE DATABASE " + c.Quote(name) }

func (c clickhouse) DropNamespace(name string) string { return "DROP DATABASE " + c.Quote(name) }

// ProtectedNamespace: the default database and the system ones.
func (clickhouse) ProtectedNamespace(name string) bool {
	switch strings.ToLower(name) {
	case "default", "system", "information_schema":
		return true
	}

	return false
}

func (c clickhouse) DropTable(ns, table string) string { return "DROP TABLE " + c.table(ns, table) }

func (c clickhouse) DropView(ns, view string) string { return "DROP VIEW " + c.table(ns, view) }

func (c clickhouse) CreateView(ns, view, query string, replace bool) string {
	return lo.Ternary(replace, "CREATE OR REPLACE VIEW ", "CREATE VIEW ") + c.table(ns, view) + " AS " + query
}

func (c clickhouse) ViewQuery(_ context.Context, db *gorm.DB, ns, view string) (string, error) {
	var query string

	return query, db.Raw("SELECT as_select FROM system.tables WHERE database = ? AND name = ?", ns, view).Scan(&query).Error
}

// --- keys, indexes, checks ---
// ClickHouse has no unique constraints, foreign keys or triggers. Its "primary key" is the sorting key,
// which only a table rebuild can change.
