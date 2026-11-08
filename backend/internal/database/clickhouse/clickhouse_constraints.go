package databaseClickhouse

import (
	"context"
	"fmt"
	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"regexp"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (clickhouse) Tabs() []contract.TreeTab {
	return []contract.TreeTab{contract.TableKeysTab, contract.TableIndexesTab, contract.TableChecksTab}
}

var (
	plainIdentifier   = regexp.MustCompile("^[A-Za-z_][A-Za-z0-9_]*$")
	checkStartPattern = regexp.MustCompile("CONSTRAINT\\s+(`[^`]+`|\\S+)\\s+CHECK\\s+")
	settingsPattern   = regexp.MustCompile(`(?s)\bSETTINGS\s+(.*)$`)
	skippingKindCheck = regexp.MustCompile(`^[A-Za-z0-9_(), .']+$`)
)

// sortingKey returns the plain column names of the sorting key; ok is false for expressions.
func (clickhouse) sortingKey(db *gorm.DB, ns, table string) (cols []string, meta struct{ Engine, Partition, Lost string }, ok bool, err error) {
	var row struct{ SortingKey, Engine, PartitionKey, EngineFull, SamplingKey, CreateTableQuery string }

	if err = db.Raw(`SELECT sorting_key, engine, partition_key, engine_full, sampling_key, create_table_query FROM system.tables WHERE database = ? AND name = ?`, ns, table).Scan(&row).Error; err != nil {
		return nil, meta, false, err
	}

	// The create query is one line, so look for the clauses a rebuild would lose in the engine definition.
	lost := ""

	switch full := " " + strings.ToUpper(row.EngineFull) + " "; {
	case strings.Contains(full, " TTL ") || strings.Contains(strings.ToUpper(row.CreateTableQuery), " TTL "):
		lost = "TTL"
	case row.SamplingKey != "":
		lost = "SAMPLE BY"
	case settingsPattern.MatchString(row.EngineFull) && strings.TrimSpace(settingsPattern.FindStringSubmatch(row.EngineFull)[1]) != "index_granularity = 8192":
		lost = "SETTINGS"
	}

	meta.Engine, meta.Partition, meta.Lost = row.Engine, row.PartitionKey, lost

	for _, part := range strings.Split(row.SortingKey, ",") {
		part = strings.Trim(strings.TrimSpace(part), "`")
		if part == "" {
			continue
		}

		if !plainIdentifier.MatchString(part) {
			return nil, meta, false, nil
		}

		cols = append(cols, part)
	}

	return cols, meta, true, nil
}

func (c clickhouse) Keys(_ context.Context, db *gorm.DB, ns, table string) ([]generic.KeyInfo, error) {
	cols, _, ok, err := c.sortingKey(db, ns, table)
	if err != nil || !ok || len(cols) == 0 {
		return nil, err
	}

	return []generic.KeyInfo{{Name: "PRIMARY", Type: "PRIMARY KEY", Columns: cols}}, nil
}

func (clickhouse) IndexList(_ context.Context, db *gorm.DB, ns, table string) ([]generic.IndexInfo, error) {
	type row struct {
		Name        string
		Expr        string
		TypeFull    string
		Granularity uint64
	}

	var found []row

	err := db.Raw(`SELECT name, expr, type_full, granularity FROM system.data_skipping_indices WHERE database = ? AND table = ? ORDER BY name`, ns, table).Scan(&found).Error

	return lo.Map(found, func(r row, _ int) generic.IndexInfo {
		return generic.IndexInfo{Name: r.Name, Expr: r.Expr, Kind: r.TypeFull, Granularity: fmt.Sprint(r.Granularity)}
	}), err
}

func (clickhouse) Checks(_ context.Context, db *gorm.DB, ns, table string) ([]generic.CheckInfo, error) {
	var create string
	if err := db.Raw(`SELECT create_table_query FROM system.tables WHERE database = ? AND name = ?`, ns, table).Scan(&create).Error; err != nil {
		return nil, err
	}

	checks := []generic.CheckInfo{}

	for _, loc := range checkStartPattern.FindAllStringSubmatchIndex(create, -1) {
		checks = append(checks, generic.CheckInfo{Name: strings.Trim(create[loc[2]:loc[3]], "`"), Expression: balancedExpression(create[loc[1]:])})
	}

	return checks, nil
}

func (clickhouse) Indexes(ctx context.Context, db *gorm.DB, ns, table string) ([]contract.StructureIndex, error) {
	indexes, err := clickhouse{}.IndexList(ctx, db, ns, table)

	return lo.Map(indexes, func(i generic.IndexInfo, _ int) contract.StructureIndex {
		return contract.StructureIndex{Name: i.Name, Columns: []string{i.Expr}}
	}), err
}

func (clickhouse) Triggers(context.Context, *gorm.DB, string, string) ([]generic.TriggerInfo, error) {
	return nil, nil
}

func (clickhouse) KeyFields(columns []contract.FormFieldOption) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Name", Type: contract.FormFieldTypeText},
		{ID: "ref_columns", Name: "Sorting key columns", Type: contract.FormFieldTypeMultiSelect, Required: true, Options: columns},
		{ID: "constraint_type", Name: "Type", Type: contract.FormFieldTypeSelect, Required: true, Options: generic.Options("PRIMARY KEY")},
	}
}

func (clickhouse) IndexFields([]contract.FormFieldOption) []contract.FormField {
	return []contract.FormField{
		{ID: "index_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "expression", Name: "Expression (e.g. user_id)", Type: contract.FormFieldTypeText, Required: true},
		{ID: "index_type", Name: "Type (minmax, set(100), bloom_filter(0.01), ...)", Type: contract.FormFieldTypeText, Required: true},
		{ID: "granularity", Name: "Granularity", Type: contract.FormFieldTypeText},
	}
}

func (clickhouse) IndexRow(i generic.IndexInfo) map[string]any {
	return map[string]any{"index_name": i.Name, "expression": i.Expr, "index_type": i.Kind, "granularity": i.Granularity}
}

func (clickhouse) TriggerFields() []contract.FormField { return nil }

var errClickHouseNo = func(what string) error { return fmt.Errorf("ClickHouse has no %s", what) }

func (clickhouse) AddKey(string, string, generic.KeyInfo) (string, error) {
	return "", errClickHouseNo("unique constraints")
}

func (clickhouse) DropKey(string, string, string) string { return "" }

func (c clickhouse) AddIndex(ns, table string, i generic.IndexInfo) ([]string, error) {
	granularity := lo.Ternary(i.Granularity == "", "1", i.Granularity)

	switch {
	case i.Name == "" || i.Expr == "" || i.Kind == "":
		return nil, fmt.Errorf("an index needs a name, an expression and a type")
	case !skippingKindCheck.MatchString(i.Kind):
		return nil, fmt.Errorf("invalid index type %q", i.Kind)
	case !regexp.MustCompile(`^\d+$`).MatchString(granularity):
		return nil, fmt.Errorf("granularity must be a number")
	case strings.ContainsAny(i.Expr, ";") || strings.Contains(i.Expr, "--") || strings.Contains(i.Expr, "/*"):
		return nil, fmt.Errorf("invalid index expression")
	}

	t := c.table(ns, table)

	return []string{
		"ALTER TABLE " + t + " ADD INDEX " + c.Quote(i.Name) + " (" + i.Expr + ") TYPE " + i.Kind + " GRANULARITY " + granularity,
		// A new index only covers new parts until it is materialized.
		"ALTER TABLE " + t + " MATERIALIZE INDEX " + c.Quote(i.Name),
	}, nil
}

func (c clickhouse) DropIndex(ns, table, name string) string {
	return "ALTER TABLE " + c.table(ns, table) + " DROP INDEX " + c.Quote(name)
}

func (clickhouse) AddForeignKey(string, string, generic.ForeignKey) string { return "" }

func (clickhouse) DropForeignKey(string, string, string) string { return "" }

func (c clickhouse) AddCheck(ns, table string, k generic.CheckInfo) string {
	return "ALTER TABLE " + c.table(ns, table) + " ADD CONSTRAINT " + c.Quote(k.Name) + " CHECK " + k.Expression
}

func (c clickhouse) DropCheck(ns, table, name string) string {
	return "ALTER TABLE " + c.table(ns, table) + " DROP CONSTRAINT " + c.Quote(name)
}

func (clickhouse) AddTrigger(string, string, generic.TriggerInfo) (string, error) {
	return "", errClickHouseNo("triggers (use a materialized view)")
}

func (clickhouse) DropTrigger(string, string, string) string { return "" }

// ReplacePrimaryKey rebuilds the table: a MergeTree sorting key cannot be changed in place.
// The copy keeps columns, skipping indexes and the partition key; tables with TTL, SETTINGS,
// a sampling key or a non-plain MergeTree engine are refused rather than silently losing those.
func (c clickhouse) ReplacePrimaryKey(_ context.Context, db *gorm.DB, ns, table string, _, cols []string) ([]string, error) {
	_, meta, _, err := c.sortingKey(db, ns, table)
	if err != nil {
		return nil, err
	}

	if meta.Engine != "MergeTree" || meta.Lost != "" {
		return nil, fmt.Errorf("the sorting key can only be changed on a plain MergeTree table; this one is %s%s, which a rebuild would lose", meta.Engine, lo.Ternary(meta.Lost == "", "", " with "+meta.Lost))
	}

	tmp := "__dbo_tmp_" + table
	order := lo.Ternary(len(cols) == 0, "tuple()", "("+strings.Join(lo.Map(cols, func(col string, _ int) string { return c.Quote(col) }), ", ")+")")
	partition := lo.Ternary(meta.Partition == "", "", " PARTITION BY "+meta.Partition)

	return []string{
		"DROP TABLE IF EXISTS " + c.table(ns, tmp),
		"CREATE TABLE " + c.table(ns, tmp) + " AS " + c.table(ns, table) + " ENGINE = MergeTree" + partition + " ORDER BY " + order,
		"INSERT INTO " + c.table(ns, tmp) + " SELECT * FROM " + c.table(ns, table),
		"EXCHANGE TABLES " + c.table(ns, tmp) + " AND " + c.table(ns, table),
		"DROP TABLE " + c.table(ns, tmp),
	}, nil
}

// balancedExpression reads up to the comma or closing parenthesis that ends the expression at depth 0.
func balancedExpression(s string) string {
	depth, quote := 0, byte(0)

	for i := 0; i < len(s); i++ {
		ch := s[i]

		switch {
		case quote != 0:
			if ch == '\\' {
				i++
			} else if ch == quote {
				quote = 0
			}
		case ch == '\'' || ch == '"' || ch == '`':
			quote = ch
		case ch == '(':
			depth++
		case ch == ')':
			if depth == 0 {
				return strings.TrimSpace(s[:i])
			}

			depth--
		case ch == ',' && depth == 0:
			return strings.TrimSpace(s[:i])
		}
	}

	return strings.TrimSpace(s)
}

var rowReturning = map[string]bool{"SELECT": true, "WITH": true, "SHOW": true, "DESCRIBE": true, "DESC": true, "EXPLAIN": true, "EXISTS": true, "VALUES": true, "CHECK": true}
