package databaseMssql

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

func (mssql) Tabs() []contract.TreeTab {
	return []contract.TreeTab{contract.TableKeysTab, contract.TableIndexesTab, contract.TableForeignKeysTab, contract.TableChecksTab, contract.TableTriggersTab}
}

func (m mssql) objectName(ns, table string) string { return m.table(ns, table) }

func (m mssql) Keys(_ context.Context, db *gorm.DB, ns, table string) ([]generic.KeyInfo, error) {
	type row struct {
		Name string
		Kind string
		Cols string
	}

	var found []row

	err := db.Raw(`
SELECT kc.name AS name, kc.type AS kind, STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS cols
FROM sys.key_constraints kc
JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE kc.parent_object_id = OBJECT_ID(?)
GROUP BY kc.name, kc.type
ORDER BY kc.type, kc.name`, m.objectName(ns, table)).Scan(&found).Error
	if err != nil {
		return nil, err
	}

	return lo.Map(found, func(r row, _ int) generic.KeyInfo {
		return generic.KeyInfo{Name: r.Name, Type: lo.Ternary(strings.TrimSpace(r.Kind) == "PK", "PRIMARY KEY", "UNIQUE"), Columns: strings.Split(r.Cols, ",")}
	}), nil
}

func (m mssql) IndexList(ctx context.Context, db *gorm.DB, ns, table string) ([]generic.IndexInfo, error) {
	indexes, err := m.Indexes(ctx, db, ns, table)

	return lo.Map(indexes, func(i contract.StructureIndex, _ int) generic.IndexInfo {
		return generic.IndexInfo{Name: i.Name, Columns: i.Columns, Unique: i.Unique}
	}), err
}

func (m mssql) Checks(_ context.Context, db *gorm.DB, ns, table string) ([]generic.CheckInfo, error) {
	type row struct{ Name, Definition string }

	var found []row

	err := db.Raw(`SELECT name, definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(?) ORDER BY name`, m.objectName(ns, table)).Scan(&found).Error

	return lo.Map(found, func(r row, _ int) generic.CheckInfo { return generic.CheckInfo{Name: r.Name, Expression: r.Definition} }), err
}

var triggerHeaderPattern = regexp.MustCompile(`(?is)^\s*create\s+trigger\b.*?\bas\b\s*(.*)$`)

var triggerEvents = []string{"INSERT", "UPDATE", "DELETE", "INSERT, UPDATE", "INSERT, DELETE", "UPDATE, DELETE", "INSERT, UPDATE, DELETE"}

func (m mssql) Triggers(_ context.Context, db *gorm.DB, ns, table string) ([]generic.TriggerInfo, error) {
	type row struct{ Name, Timing, Events, Def string }

	var found []row

	err := db.Raw(`
SELECT t.name AS name,
       CASE WHEN t.is_instead_of_trigger = 1 THEN 'INSTEAD OF' ELSE 'AFTER' END AS timing,
       (SELECT STRING_AGG(e.type_desc, ', ') WITHIN GROUP (ORDER BY e.type) FROM (SELECT DISTINCT type, type_desc FROM sys.trigger_events WHERE object_id = t.object_id) e) AS events,
       OBJECT_DEFINITION(t.object_id) AS def
FROM sys.triggers t WHERE t.parent_id = OBJECT_ID(?) ORDER BY t.name`, m.objectName(ns, table)).Scan(&found).Error
	if err != nil {
		return nil, err
	}

	return lo.Map(found, func(r row, _ int) generic.TriggerInfo {
		body := r.Def
		if match := triggerHeaderPattern.FindStringSubmatch(r.Def); match != nil {
			body = strings.TrimSpace(match[1])
		}

		return generic.TriggerInfo{Name: r.Name, Timing: r.Timing, Event: r.Events, Body: body}
	}), nil
}

func (mssql) KeyFields(columns []contract.FormFieldOption) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "ref_columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Required: true, Options: columns},
		{ID: "constraint_type", Name: "Type", Type: contract.FormFieldTypeSelect, Required: true, Options: generic.Options("PRIMARY KEY", "UNIQUE")},
	}
}

func (mssql) IndexFields(columns []contract.FormFieldOption) []contract.FormField {
	return []contract.FormField{
		{ID: "index_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "ref_columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Required: true, Options: columns},
		{ID: "unique", Name: "Unique", Type: contract.FormFieldTypeCheckBox},
	}
}

func (mssql) IndexRow(i generic.IndexInfo) map[string]any {
	return map[string]any{"index_name": i.Name, "ref_columns": i.Columns, "unique": i.Unique}
}

func (mssql) TriggerFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "timing", Name: "Timing", Type: contract.FormFieldTypeSelect, Required: true, Options: generic.Options("AFTER", "INSTEAD OF")},
		{ID: "event", Name: "Event", Type: contract.FormFieldTypeSelect, Required: true, Options: generic.Options(triggerEvents...)},
		{ID: "body", Name: "Body (statements after AS)", Type: contract.FormFieldTypeQuery, Required: true},
	}
}

func (m mssql) quoteAll(cols []string) string {
	return strings.Join(lo.Map(cols, func(c string, _ int) string { return m.Quote(c) }), ", ")
}

func (m mssql) AddKey(ns, table string, k generic.KeyInfo) (string, error) {
	return "ALTER TABLE " + m.table(ns, table) + " ADD CONSTRAINT " + m.Quote(k.Name) + " " + k.Type + " (" + m.quoteAll(k.Columns) + ")", nil
}

func (m mssql) dropConstraint(ns, table, name string) string {
	return "ALTER TABLE " + m.table(ns, table) + " DROP CONSTRAINT " + m.Quote(name)
}

func (m mssql) DropKey(ns, table, name string) string { return m.dropConstraint(ns, table, name) }

func (m mssql) AddIndex(ns, table string, i generic.IndexInfo) ([]string, error) {
	if i.Name == "" || len(i.Columns) == 0 {
		return nil, fmt.Errorf("an index needs a name and at least one column")
	}

	return []string{"CREATE " + lo.Ternary(i.Unique, "UNIQUE ", "") + "INDEX " + m.Quote(i.Name) + " ON " + m.table(ns, table) + " (" + m.quoteAll(i.Columns) + ")"}, nil
}

func (m mssql) DropIndex(ns, table, name string) string {
	return "DROP INDEX " + m.Quote(name) + " ON " + m.table(ns, table)
}

func (m mssql) AddForeignKey(ns, table string, fk generic.ForeignKey) string {
	sql := "ALTER TABLE " + m.table(ns, table) + " ADD CONSTRAINT " + m.Quote(fk.Name) + " FOREIGN KEY (" + m.quoteAll(fk.Columns) + ") REFERENCES " +
		m.table(fk.RefSchema, fk.RefTable) + " (" + m.quoteAll(fk.RefColumns) + ")"
	if fk.OnDelete != "" {
		sql += " ON DELETE " + fk.OnDelete
	}

	if fk.OnUpdate != "" {
		sql += " ON UPDATE " + fk.OnUpdate
	}

	return sql
}

func (m mssql) DropForeignKey(ns, table, name string) string {
	return m.dropConstraint(ns, table, name)
}

func (m mssql) AddCheck(ns, table string, c generic.CheckInfo) string {
	return "ALTER TABLE " + m.table(ns, table) + " ADD CONSTRAINT " + m.Quote(c.Name) + " CHECK (" + c.Expression + ")"
}

func (m mssql) DropCheck(ns, table, name string) string { return m.dropConstraint(ns, table, name) }

func (m mssql) AddTrigger(ns, table string, t generic.TriggerInfo) (string, error) {
	if t.Name == "" || t.Body == "" || !lo.Contains([]string{"AFTER", "INSTEAD OF"}, strings.ToUpper(t.Timing)) || !lo.Contains(triggerEvents, strings.ToUpper(t.Event)) {
		return "", fmt.Errorf("a trigger needs a name, a timing (AFTER or INSTEAD OF), an event and a body")
	}

	return "CREATE TRIGGER " + m.table(ns, t.Name) + " ON " + m.table(ns, table) + " " + strings.ToUpper(t.Timing) + " " + strings.ToUpper(t.Event) + " AS " + t.Body, nil
}

func (m mssql) DropTrigger(ns, _, name string) string { return "DROP TRIGGER " + m.table(ns, name) }

// literal is a T-SQL unicode string literal.
func tsqlLiteral(s string) string { return "N'" + strings.ReplaceAll(s, "'", "''") + "'" }

// dropNamedConstraint drops the constraint a catalog query finds; the name is not known to the caller.
func (m mssql) dropFound(ns, table, nameQuery string) string {
	return fmt.Sprintf(`DECLARE @dbo_c sysname = (%s); IF @dbo_c IS NOT NULL BEGIN DECLARE @dbo_sql nvarchar(max) = N'ALTER TABLE ' + QUOTENAME(%s) + N'.' + QUOTENAME(%s) + N' DROP CONSTRAINT ' + QUOTENAME(@dbo_c); EXEC(@dbo_sql); END`,
		nameQuery, tsqlLiteral(ns), tsqlLiteral(table))
}

func (m mssql) dropDefault(ns, table, column string) string {
	return m.dropFound(ns, table, fmt.Sprintf(`SELECT d.name FROM sys.default_constraints d JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id WHERE d.parent_object_id = OBJECT_ID(%s) AND c.name = %s`,
		tsqlLiteral(m.table(ns, table)), tsqlLiteral(column)))
}

func (m mssql) ReplacePrimaryKey(_ context.Context, _ *gorm.DB, ns, table string, old, cols []string) ([]string, error) {
	var statements []string

	if len(old) > 0 {
		statements = append(statements, m.dropFound(ns, table, fmt.Sprintf(`SELECT name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(%s) AND type = 'PK'`, tsqlLiteral(m.table(ns, table)))))
	}

	if len(cols) > 0 {
		statements = append(statements, "ALTER TABLE "+m.table(ns, table)+" ADD CONSTRAINT "+m.Quote("PK_"+table)+" PRIMARY KEY ("+m.quoteAll(cols)+")")
	}

	return statements, nil
}
