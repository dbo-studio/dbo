package databaseClickhouse

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// The Storage tab: engine, ORDER BY, PARTITION BY, TTL and SETTINGS. Engine, ORDER BY and PARTITION BY are fixed at
// creation (ClickHouse cannot change them in place); TTL and SETTINGS can be altered.

var (
	// mergeTreeEngines accept ORDER BY, PARTITION BY, TTL and SETTINGS; the others take none of them.
	mergeTreeEngines = []string{"MergeTree", "ReplacingMergeTree", "SummingMergeTree", "AggregatingMergeTree"}
	simpleEngines    = []string{"Log", "TinyLog", "StripeLog", "Memory"}

	ttlPattern        = regexp.MustCompile(`(?is)\sTTL\s+(.*?)(?:\sSETTINGS\s|$)`)
	settingsListShape = regexp.MustCompile(`^\w+\s*=\s*[\w.'"+-]+(\s*,\s*\w+\s*=\s*[\w.'"+-]+)*$`)
)

func (clickhouse) StorageFields(create bool) []contract.FormField {
	engines := lo.Map(append(append([]string{}, mergeTreeEngines...), simpleEngines...), func(e string, _ int) contract.FormFieldOption {
		return contract.FormFieldOption{Value: e, Label: e}
	})

	suffix := lo.Ternary(create, "", " (fixed after creation)")

	return []contract.FormField{
		{ID: "engine", Name: "Engine" + suffix, Type: contract.FormFieldTypeSelect, Options: engines},
		{ID: "order_by", Name: "ORDER BY" + suffix, Type: contract.FormFieldTypeText},
		{ID: "partition_by", Name: "PARTITION BY" + suffix, Type: contract.FormFieldTypeText},
		{ID: "ttl", Name: "TTL (e.g. created + INTERVAL 30 DAY)", Type: contract.FormFieldTypeText},
		{ID: "settings", Name: "SETTINGS (e.g. index_granularity = 4096)", Type: contract.FormFieldTypeText},
	}
}

func (clickhouse) StorageRow(_ context.Context, db *gorm.DB, ns, table string) (map[string]any, error) {
	var row struct{ Engine, SortingKey, PartitionKey, EngineFull string }

	if err := db.Raw(`SELECT engine, sorting_key, partition_key, engine_full FROM system.tables WHERE database = ? AND name = ?`, ns, table).Scan(&row).Error; err != nil {
		return nil, err
	}

	full := " " + row.EngineFull

	return map[string]any{
		"engine":       row.Engine,
		"order_by":     row.SortingKey,
		"partition_by": row.PartitionKey,
		"ttl":          firstGroup(ttlPattern, full),
		"settings":     firstGroup(settingsPattern, full),
	}, nil
}

func firstGroup(re *regexp.Regexp, s string) string {
	if m := re.FindStringSubmatch(s); m != nil {
		return strings.TrimSpace(m[1])
	}

	return ""
}

// storageExpression guards a free-text clause: it must stay one clause of the one statement.
func storageExpression(label, v string) error {
	if strings.ContainsAny(v, ";") || strings.Contains(v, "--") || strings.Contains(v, "/*") {
		return fmt.Errorf("%s must be a single expression", label)
	}

	return nil
}

func validateStorage(opts map[string]string) error {
	for label, key := range map[string]string{"ORDER BY": "order_by", "PARTITION BY": "partition_by", "TTL": "ttl", "SETTINGS": "settings"} {
		if err := storageExpression(label, opts[key]); err != nil {
			return err
		}
	}

	if s := opts["settings"]; s != "" && !settingsListShape.MatchString(s) {
		return fmt.Errorf("SETTINGS must look like name = value, name = value")
	}

	return nil
}

func (c clickhouse) CreateTableWith(ns, table string, cols []generic.ColSpec, opts map[string]string) (string, error) {
	if err := validateStorage(opts); err != nil {
		return "", err
	}

	engine := lo.Ternary(opts["engine"] == "", "MergeTree", opts["engine"])

	switch {
	case lo.Contains(simpleEngines, engine):
		if opts["order_by"] != "" || opts["partition_by"] != "" || opts["ttl"] != "" || opts["settings"] != "" {
			return "", fmt.Errorf("the %s engine takes no ORDER BY, PARTITION BY, TTL or SETTINGS", engine)
		}

		return c.createWith(ns, table, cols, engine, ""), nil
	case !lo.Contains(mergeTreeEngines, engine):
		return "", fmt.Errorf("unsupported engine %q", engine)
	}

	order := opts["order_by"]
	if order == "" {
		order = "tuple()"
		if pk := lo.FilterMap(cols, func(col generic.ColSpec, _ int) (string, bool) { return c.Quote(col.Name), col.Primary }); len(pk) > 0 {
			order = "(" + strings.Join(pk, ", ") + ")"
		}
	}

	clauses := ""
	if opts["partition_by"] != "" {
		clauses += " PARTITION BY " + opts["partition_by"]
	}

	clauses += " ORDER BY " + order

	if opts["ttl"] != "" {
		clauses += " TTL " + opts["ttl"]
	}

	if opts["settings"] != "" {
		clauses += " SETTINGS " + opts["settings"]
	}

	return c.createWith(ns, table, cols, engine, clauses), nil
}

func (c clickhouse) createWith(ns, table string, cols []generic.ColSpec, engine, clauses string) string {
	defs := lo.Map(cols, func(col generic.ColSpec, _ int) string {
		return c.Quote(col.Name) + " " + col.Type + columnDefault(col)
	})

	return "CREATE TABLE " + c.table(ns, table) + " (" + strings.Join(defs, ", ") + ") ENGINE = " + engine + clauses
}

func (c clickhouse) AlterStorage(ns, table string, old, next map[string]string) ([]string, error) {
	for key, label := range map[string]string{"engine": "Engine", "order_by": "ORDER BY", "partition_by": "PARTITION BY"} {
		if was, sent := old[key]; sent && was != next[key] {
			return nil, fmt.Errorf("%s cannot be changed after the table is created", label)
		}
	}

	if err := validateStorage(next); err != nil {
		return nil, err
	}

	var statements []string

	if old["ttl"] != next["ttl"] {
		if next["ttl"] == "" {
			statements = append(statements, "ALTER TABLE "+c.table(ns, table)+" REMOVE TTL")
		} else {
			statements = append(statements, "ALTER TABLE "+c.table(ns, table)+" MODIFY TTL "+next["ttl"])
		}
	}

	if old["settings"] != next["settings"] {
		oldSet, newSet := parseSettings(old["settings"]), parseSettings(next["settings"])

		changed := []string{}

		for _, name := range sortedKeys(newSet) {
			if oldSet[name] != newSet[name] {
				changed = append(changed, name+" = "+newSet[name])
			}
		}

		if len(changed) > 0 {
			statements = append(statements, "ALTER TABLE "+c.table(ns, table)+" MODIFY SETTING "+strings.Join(changed, ", "))
		}

		if removed := lo.Filter(sortedKeys(oldSet), func(name string, _ int) bool { _, kept := newSet[name]; return !kept }); len(removed) > 0 {
			statements = append(statements, "ALTER TABLE "+c.table(ns, table)+" RESET SETTING "+strings.Join(removed, ", "))
		}
	}

	return statements, nil
}

func parseSettings(s string) map[string]string {
	out := map[string]string{}

	for _, part := range strings.Split(s, ",") {
		name, value, ok := strings.Cut(part, "=")
		if ok {
			out[strings.TrimSpace(name)] = strings.TrimSpace(value)
		}
	}

	return out
}

func sortedKeys(m map[string]string) []string {
	keys := lo.Keys(m)
	sort.Strings(keys)

	return keys
}
