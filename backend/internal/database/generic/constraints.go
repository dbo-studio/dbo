package databaseGeneric

import (
	"context"
	"errors"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// KeyInfo is a primary key or unique constraint.
type KeyInfo struct {
	Name    string
	Type    string // "PRIMARY KEY" | "UNIQUE"
	Columns []string
}

// IndexInfo is a secondary index. ClickHouse skipping indexes use Expr/Kind/Granularity instead of Columns.
type IndexInfo struct {
	Name        string
	Columns     []string
	Unique      bool
	Expr        string
	Kind        string
	Granularity string
}

type CheckInfo struct {
	Name       string
	Expression string
}

type TriggerInfo struct {
	Name   string
	Timing string
	Event  string
	Body   string
}

// Constraints is what a dialect implements for the Keys, Indexes, Foreign Keys, Checks and Triggers tabs.
// A dialect lists the tabs it supports in Tabs; the rest of the methods may return errUnsupportedForm.
type Constraints interface {
	Tabs() []contract.TreeTab

	Keys(ctx context.Context, db *gorm.DB, ns, table string) ([]KeyInfo, error)
	IndexList(ctx context.Context, db *gorm.DB, ns, table string) ([]IndexInfo, error)
	Checks(ctx context.Context, db *gorm.DB, ns, table string) ([]CheckInfo, error)
	Triggers(ctx context.Context, db *gorm.DB, ns, table string) ([]TriggerInfo, error)

	KeyFields(columns []contract.FormFieldOption) []contract.FormField
	IndexFields(columns []contract.FormFieldOption) []contract.FormField
	IndexRow(i IndexInfo) map[string]any
	TriggerFields() []contract.FormField

	AddKey(ns, table string, k KeyInfo) (string, error)
	DropKey(ns, table, name string) string
	AddIndex(ns, table string, i IndexInfo) ([]string, error)
	DropIndex(ns, table, name string) string
	AddForeignKey(ns, table string, fk ForeignKey) (string, error)
	DropForeignKey(ns, table, name string) string
	AddCheck(ns, table string, c CheckInfo) string
	DropCheck(ns, table, name string) string
	AddTrigger(ns, table string, t TriggerInfo) (string, error)
	DropTrigger(ns, table, name string) string

	// ReplacePrimaryKey makes cols the primary key (empty drops it). old is the current key.
	ReplacePrimaryKey(ctx context.Context, db *gorm.DB, ns, table string, old, cols []string) ([]string, error)
}

func (r *Repository) constraints() (Constraints, bool) {
	c, ok := r.d.(Constraints)

	return c, ok
}

func columnOptions(columns []ColumnInfo) []contract.FormFieldOption {
	return lo.Map(columns, func(c ColumnInfo, _ int) contract.FormFieldOption {
		return contract.FormFieldOption{Value: c.Name, Label: c.Name}
	})
}

// change is one row of an array tab: New/Old are what the form submits, Added/Deleted mark the row state.
type change[T any] struct {
	New     *T    `json:"new"`
	Old     *T    `json:"old"`
	Added   *bool `json:"added"`
	Deleted *bool `json:"deleted"`
}

type rows[T any] struct {
	Columns []change[T] `json:"columns"`
}

type (
	keyData struct {
		Name    *string  `json:"constraint_name"`
		Columns []string `json:"ref_columns"`
		Type    *string  `json:"constraint_type"`
	}
	indexData struct {
		Name        *string  `json:"index_name"`
		Columns     []string `json:"ref_columns"`
		Unique      *bool    `json:"unique"`
		Expr        *string  `json:"expression"`
		Kind        *string  `json:"index_type"`
		Granularity *string  `json:"granularity"`
	}
	foreignKeyData struct {
		Name          *string  `json:"constraint_name"`
		SourceColumns []string `json:"ref_columns"`
		TargetTable   *string  `json:"target_table"`
		TargetColumns []string `json:"target_columns"`
		OnUpdate      *string  `json:"update_action"`
		OnDelete      *string  `json:"delete_action"`
	}
	checkData struct {
		Name       *string `json:"name"`
		Expression *string `json:"expression"`
	}
	triggerData struct {
		Name   *string `json:"name"`
		Timing *string `json:"timing"`
		Event  *string `json:"event"`
		Body   *string `json:"body"`
	}
)

func parseTab[T any](params []byte, tab contract.TreeTab) ([]change[T], error) {
	tabs, err := helper.ConvertToDTO[map[contract.TreeTab]*rows[T]](params)
	if err != nil {
		return nil, apperror.Validation(err)
	}

	if tabs[tab] == nil {
		return nil, nil
	}

	return tabs[tab].Columns, nil
}

// statements turns the rows of one tab into drops (run before column changes) and adds (run after).
// A changed row is dropped by its old name and added again.
func statements[T any](rowsOf []change[T], name func(*T) string, drop func(string) string, add func(*T) ([]string, error)) (drops, adds []string, err error) {
	for _, row := range rowsOf {
		deleted, added := lo.FromPtr(row.Deleted), lo.FromPtr(row.Added)

		if row.Old != nil && !added && name(row.Old) != "" {
			drops = append(drops, drop(name(row.Old)))
		}

		if deleted || row.New == nil {
			continue
		}

		sqls, err := add(row.New)
		if err != nil {
			return nil, nil, apperror.Validation(err)
		}

		adds = append(adds, sqls...)
	}

	return drops, adds, nil
}

func str(p *string) string { return strings.TrimSpace(lo.FromPtr(p)) }

// constraintStatements plans the Keys, Indexes, Foreign Keys, Checks and Triggers tabs of one table.
func (r *Repository) constraintStatements(ns, table string, params []byte) (drops, adds []string, keysChanged bool, err error) {
	c, ok := r.d.(Constraints)
	if !ok {
		return nil, nil, false, nil
	}

	collect := func(d, a []string, e error) error {
		if e != nil {
			return e
		}

		drops, adds = append(drops, d...), append(adds, a...)

		return nil
	}

	triggers, err := parseTab[triggerData](params, contract.TableTriggersTab)
	if err != nil {
		return nil, nil, false, err
	}

	// A dialect with CREATE OR ALTER replaces an edited trigger in one statement, so a failed edit keeps the old one.
	if replacer, ok := r.d.(interface{ ReplacesTriggers() bool }); ok && replacer.ReplacesTriggers() {
		for i := range triggers {
			if triggers[i].Old != nil && triggers[i].New != nil && !lo.FromPtr(triggers[i].Added) && str(triggers[i].Old.Name) == str(triggers[i].New.Name) {
				triggers[i].Old = nil
			}
		}
	}

	d, a, err := statements(triggers, func(t *triggerData) string { return str(t.Name) },
		func(n string) string { return c.DropTrigger(ns, table, n) },
		func(t *triggerData) ([]string, error) {
			sql, err := c.AddTrigger(ns, table, TriggerInfo{Name: str(t.Name), Timing: str(t.Timing), Event: str(t.Event), Body: str(t.Body)})

			return []string{sql}, err
		})
	if err := collect(d, a, err); err != nil {
		return nil, nil, false, err
	}

	fks, err := parseTab[foreignKeyData](params, contract.TableForeignKeysTab)
	if err != nil {
		return nil, nil, false, err
	}

	d, a, err = statements(fks, func(f *foreignKeyData) string { return str(f.Name) },
		func(n string) string { return c.DropForeignKey(ns, table, n) },
		func(f *foreignKeyData) ([]string, error) {
			if str(f.Name) == "" || str(f.TargetTable) == "" || len(f.SourceColumns) == 0 || len(f.TargetColumns) != len(f.SourceColumns) {
				return nil, errors.New("a foreign key needs a name, a target table and matching source and target columns")
			}

			sql, err := c.AddForeignKey(ns, table, ForeignKey{
				Name: str(f.Name), Columns: f.SourceColumns, RefSchema: ns, RefTable: str(f.TargetTable), RefColumns: f.TargetColumns,
				OnUpdate: referentialAction(f.OnUpdate), OnDelete: referentialAction(f.OnDelete),
			})
			if err != nil {
				return nil, err
			}

			return []string{sql}, nil
		})
	if err := collect(d, a, err); err != nil {
		return nil, nil, false, err
	}

	checks, err := parseTab[checkData](params, contract.TableChecksTab)
	if err != nil {
		return nil, nil, false, err
	}

	d, a, err = statements(checks, func(k *checkData) string { return str(k.Name) },
		func(n string) string { return c.DropCheck(ns, table, n) },
		func(k *checkData) ([]string, error) {
			if str(k.Name) == "" || str(k.Expression) == "" {
				return nil, errors.New("a check needs a name and an expression")
			}

			return []string{c.AddCheck(ns, table, CheckInfo{Name: str(k.Name), Expression: str(k.Expression)})}, nil
		})
	if err := collect(d, a, err); err != nil {
		return nil, nil, false, err
	}

	indexes, err := parseTab[indexData](params, contract.TableIndexesTab)
	if err != nil {
		return nil, nil, false, err
	}

	d, a, err = statements(indexes, func(i *indexData) string { return str(i.Name) },
		func(n string) string { return c.DropIndex(ns, table, n) },
		func(i *indexData) ([]string, error) {
			return c.AddIndex(ns, table, IndexInfo{
				Name: str(i.Name), Columns: i.Columns, Unique: lo.FromPtr(i.Unique),
				Expr: str(i.Expr), Kind: str(i.Kind), Granularity: str(i.Granularity),
			})
		})
	if err := collect(d, a, err); err != nil {
		return nil, nil, false, err
	}

	return drops, adds, false, nil
}

// referentialAction keeps only the actions SQL allows.
func referentialAction(p *string) string {
	switch v := strings.ToUpper(str(p)); v {
	case "NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT":
		return v
	default:
		return ""
	}
}

func sameSet(a, b []string) bool { return len(a) == len(b) && lo.Every(a, b) }

var errKeysNeedColumns = errors.New("a key needs a name and at least one column")

// keyStatements plans the Keys tab. The primary key is replaced as a whole; unique constraints are dropped and added.
func (r *Repository) keyStatements(ctx context.Context, ns, table string, params []byte, create bool) (drops, adds []string, pkSet bool, err error) {
	c, ok := r.d.(Constraints)
	if !ok {
		return nil, nil, false, nil
	}

	keys, err := parseTab[keyData](params, contract.TableKeysTab)
	if err != nil || len(keys) == 0 {
		return nil, nil, false, err
	}

	db := r.base.DB().WithContext(ctx)

	var current []KeyInfo
	if !create {
		if current, err = c.Keys(ctx, db, ns, table); err != nil {
			return nil, nil, false, apperror.DriverError(err)
		}
	}

	oldPK := []string{}
	if pk, found := lo.Find(current, func(k KeyInfo) bool { return k.Type == "PRIMARY KEY" }); found {
		oldPK = pk.Columns
	}

	newPK, replace := oldPK, false

	for _, row := range keys {
		deleted, added := lo.FromPtr(row.Deleted), lo.FromPtr(row.Added)
		isPK := func(k *keyData) bool { return strings.EqualFold(str(k.Type), "PRIMARY KEY") }

		if row.Old != nil && !added && isPK(row.Old) {
			newPK, replace = []string{}, true
		}

		if row.Old != nil && !added && !isPK(row.Old) && str(row.Old.Name) != "" {
			drops = append(drops, c.DropKey(ns, table, str(row.Old.Name)))
		}

		if deleted || row.New == nil {
			continue
		}

		if str(row.New.Name) == "" || len(row.New.Columns) == 0 {
			return nil, nil, false, apperror.Validation(errKeysNeedColumns)
		}

		if isPK(row.New) {
			newPK, replace = row.New.Columns, true

			continue
		}

		sql, err := c.AddKey(ns, table, KeyInfo{Name: str(row.New.Name), Type: "UNIQUE", Columns: row.New.Columns})
		if err != nil {
			return nil, nil, false, apperror.Validation(err)
		}

		adds = append(adds, sql)
	}

	if replace && !sameSet(oldPK, newPK) {
		sqls, err := c.ReplacePrimaryKey(ctx, db, ns, table, oldPK, newPK)
		if err != nil {
			return nil, nil, false, apperror.Validation(err)
		}

		adds = append(adds, sqls...)
	}

	return drops, adds, true, nil
}

// --- reading ---

func (r *Repository) constraintRows(ctx context.Context, ns, table string, tab contract.TreeTab) (*contract.FormResponse, error) {
	c, ok := r.d.(Constraints)
	if !ok {
		return nil, errUnsupportedForm
	}

	db := r.base.DB().WithContext(ctx)

	var columns []ColumnInfo

	if table != "" {
		var err error
		if columns, err = r.d.Columns(ctx, db, ns, table); err != nil {
			return nil, apperror.DriverError(err)
		}
	}

	options := columnOptions(columns)
	result := []map[string]any{}

	wrap := func(err error) error { return apperror.DriverError(err) }

	switch tab {
	case contract.TableKeysTab:
		if table != "" {
			keys, err := c.Keys(ctx, db, ns, table)
			if err != nil {
				return nil, wrap(err)
			}

			result = lo.Map(keys, func(k KeyInfo, _ int) map[string]any {
				return map[string]any{"constraint_name": k.Name, "ref_columns": k.Columns, "constraint_type": k.Type}
			})
		}

		return r.base.BuildArrayFormResponse(result, c.KeyFields(options))
	case contract.TableIndexesTab:
		if table != "" {
			indexes, err := c.IndexList(ctx, db, ns, table)
			if err != nil {
				return nil, wrap(err)
			}

			result = lo.Map(indexes, func(i IndexInfo, _ int) map[string]any { return c.IndexRow(i) })
		}

		return r.base.BuildArrayFormResponse(result, c.IndexFields(options))
	case contract.TableForeignKeysTab:
		if table != "" {
			fks, err := r.d.ForeignKeys(ctx, db, ns, table)
			if err != nil {
				return nil, wrap(err)
			}

			result = lo.Map(fks, func(f ForeignKey, _ int) map[string]any {
				return map[string]any{
					"constraint_name": f.Name, "target_table": f.RefTable, "ref_columns": f.Columns,
					"target_columns": f.RefColumns, "update_action": strings.ReplaceAll(f.OnUpdate, "_", " "), "delete_action": strings.ReplaceAll(f.OnDelete, "_", " "),
				}
			})
		}

		tables, err := r.d.Tables(ctx, db, ns)
		if err != nil {
			return nil, wrap(err)
		}

		return r.base.BuildArrayFormResponse(result, r.foreignKeyFields(tables, options))
	case contract.TableChecksTab:
		if table != "" {
			checks, err := c.Checks(ctx, db, ns, table)
			if err != nil {
				return nil, wrap(err)
			}

			result = lo.Map(checks, func(k CheckInfo, _ int) map[string]any {
				return map[string]any{"name": k.Name, "expression": k.Expression}
			})
		}

		return r.base.BuildArrayFormResponse(result, []contract.FormField{
			{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
			{ID: "expression", Name: "Expression", Type: contract.FormFieldTypeText, Required: true},
		})
	case contract.TableTriggersTab:
		if table != "" {
			triggers, err := c.Triggers(ctx, db, ns, table)
			if err != nil {
				return nil, wrap(err)
			}

			result = lo.Map(triggers, func(t TriggerInfo, _ int) map[string]any {
				return map[string]any{"name": t.Name, "timing": t.Timing, "event": t.Event, "body": t.Body}
			})
		}

		return r.base.BuildArrayFormResponse(result, c.TriggerFields())
	default:
		return nil, errUnsupportedForm
	}
}

func (r *Repository) foreignKeyFields(tables []string, columns []contract.FormFieldOption) []contract.FormField {
	actions := Options("NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT")

	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "target_table", Name: "Target Table", Type: contract.FormFieldTypeSelect, Required: true, Options: lo.Map(tables, func(t string, _ int) contract.FormFieldOption {
			return contract.FormFieldOption{Value: t, Label: t}
		})},
		{ID: "ref_columns", Name: "Source Columns", Type: contract.FormFieldTypeMultiSelect, Required: true, Options: columns},
		{
			ID: "target_columns", Name: "Target Columns", Type: contract.FormFieldTypeMultiSelect, Required: true,
			DependsOn: &contract.FieldDependency{FieldID: "target_table", Parameters: map[string]string{"field": "columns", "table": "?"}},
		},
		{ID: "update_action", Name: "On Update", Type: contract.FormFieldTypeSelect, Options: actions},
		{ID: "delete_action", Name: "On Delete", Type: contract.FormFieldTypeSelect, Options: actions},
	}
}
