package databaseMssql

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

func (mssql) ColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "data_type", Name: "Data Type", Type: contract.FormFieldTypeSelect, Required: true, Options: generic.Options(
			"bigint", "int", "smallint", "tinyint", "bit", "decimal", "numeric", "money", "float", "real",
			"date", "datetime2", "datetime", "datetimeoffset", "time", "char", "varchar", "nchar", "nvarchar",
			"text", "ntext", "uniqueidentifier", "varbinary", "binary", "xml",
		)},
		{ID: "primary", Name: "Primary Key", Type: contract.FormFieldTypeCheckBox},
		{ID: "not_null", Name: "Not Null", Type: contract.FormFieldTypeCheckBox},
		{ID: "column_default", Name: "Default", Type: contract.FormFieldTypeText},
		{ID: "character_maximum_length", Name: "Length / precision (number or max)", Type: contract.FormFieldTypeText},
		{ID: "numeric_scale", Name: "Scale", Type: contract.FormFieldTypeText},
		{ID: "is_identity", Name: "Identity", Type: contract.FormFieldTypeCheckBox},
		{ID: "is_generated", Name: "Computed (Default holds the expression)", Type: contract.FormFieldTypeCheckBox},
	}
}

func (mssql) ColumnRow(c generic.ColumnInfo) map[string]any {
	base, length, scale := generic.SplitType(c.DataType)

	row := map[string]any{
		"column_name":    c.Name,
		"data_type":      base,
		"primary":        c.IsPrimaryKey,
		"not_null":       c.NotNull,
		"column_default": lo.FromPtr(c.Default),
		"is_identity":    c.IsIdentity,
		"is_generated":   c.Generated,
	}

	if length != "" {
		row["character_maximum_length"] = length
	}

	if scale != "" {
		row["numeric_scale"] = scale
	}

	return row
}

func (mssql) ColumnSpec(d *dto.MysqlTableColumnData) (generic.ColSpec, error) {
	if err := generic.RequireName(d); err != nil {
		return generic.ColSpec{}, err
	}

	typeText := strings.TrimSpace(*d.DataType)
	if length := strings.TrimSpace(lo.FromPtr(d.MaxLength)); length != "" {
		typeText += "(" + length
		if scale := strings.TrimSpace(lo.FromPtr(d.NumericScale)); scale != "" {
			typeText += "," + scale
		}

		typeText += ")"
	}

	if !mssqlTypePattern.MatchString(typeText) {
		return generic.ColSpec{}, fmt.Errorf("invalid data type %q", typeText)
	}

	spec := generic.NewColSpec(d, typeText)

	return spec, generic.CheckGenerated(spec)
}

func (m mssql) columnDefinition(c generic.ColSpec) string {
	// A computed column takes its type from the expression.
	if c.Generated {
		return m.Quote(c.Name) + " AS (" + c.Default + ")"
	}

	def := m.Quote(c.Name) + " " + c.Type
	if c.Identity {
		def += " IDENTITY(1,1)"
	}

	if c.NotNull || c.Primary {
		def += " NOT NULL"
	} else {
		def += " NULL"
	}

	return def + generic.SQLDefault(c.Default)
}

func (m mssql) table(ns, table string) string { return m.Quote(ns) + "." + m.Quote(table) }

func (m mssql) CreateTable(ns, table string, cols []generic.ColSpec) string {
	defs := lo.Map(cols, func(c generic.ColSpec, _ int) string { return m.columnDefinition(c) })

	if pk := lo.FilterMap(cols, func(c generic.ColSpec, _ int) (string, bool) { return m.Quote(c.Name), c.Primary }); len(pk) > 0 {
		defs = append(defs, "CONSTRAINT "+m.Quote("PK_"+table)+" PRIMARY KEY ("+strings.Join(pk, ", ")+")")
	}

	return "CREATE TABLE " + m.table(ns, table) + " (" + strings.Join(defs, ", ") + ")"
}

func (m mssql) AddColumn(ns, table string, c generic.ColSpec) string {
	return "ALTER TABLE " + m.table(ns, table) + " ADD " + m.columnDefinition(c)
}

func (m mssql) DropColumn(ns, table, column string) string {
	return "ALTER TABLE " + m.table(ns, table) + " DROP COLUMN " + m.Quote(column)
}

func (m mssql) ChangeColumn(ns, table string, old, next generic.ColSpec) ([]string, error) {
	if old.Identity != next.Identity {
		return nil, fmt.Errorf("SQL Server cannot turn identity on or off for an existing column; add a new identity column or rebuild the table")
	}

	if old.Generated != next.Generated {
		return nil, fmt.Errorf("SQL Server cannot turn a column into a computed column or back; add a new column instead")
	}

	var statements []string

	name := old.Name

	if old.Name != next.Name {
		statements = append(statements, fmt.Sprintf("EXEC sp_rename N'%s', N'%s', N'COLUMN'",
			strings.ReplaceAll(m.table(ns, table)+"."+m.Quote(old.Name), "'", "''"), strings.ReplaceAll(next.Name, "'", "''")))
		name = next.Name
	}

	// A computed column holds no data, so a new expression is a drop and add.
	if next.Generated {
		if old.Default != next.Default {
			statements = append(statements, m.DropColumn(ns, table, name), m.AddColumn(ns, table, generic.ColSpec{Name: name, Default: next.Default, Generated: true}))
		}

		return statements, nil
	}

	typeChanged := old.Type != next.Type || old.NotNull != next.NotNull
	defaultChanged := old.Default != next.Default

	// A column cannot be altered while a default depends on it, so the default is dropped and put back.
	if (typeChanged || defaultChanged) && old.Default != "" {
		statements = append(statements, m.dropDefault(ns, table, name))
	}

	if typeChanged {
		nullability := lo.Ternary(next.NotNull || next.Primary, "NOT NULL", "NULL")
		statements = append(statements, "ALTER TABLE "+m.table(ns, table)+" ALTER COLUMN "+m.Quote(name)+" "+next.Type+" "+nullability)
	}

	if (typeChanged || defaultChanged) && next.Default != "" {
		statements = append(statements, "ALTER TABLE "+m.table(ns, table)+" ADD DEFAULT "+next.Default+" FOR "+m.Quote(name))
	}

	return statements, nil
}

func (m mssql) RenameTable(ns, old, next string) string {
	return fmt.Sprintf("EXEC sp_rename N'%s', N'%s'", strings.ReplaceAll(m.table(ns, old), "'", "''"), strings.ReplaceAll(next, "'", "''"))
}

func (m mssql) CreateNamespace(name string) string { return "CREATE SCHEMA " + m.Quote(name) }

func (m mssql) DropNamespace(name string) string { return "DROP SCHEMA " + m.Quote(name) }

// ProtectedNamespace: the built-in schemas that remain visible in the tree.
func (mssql) ProtectedNamespace(name string) bool {
	return strings.EqualFold(name, "dbo") || strings.HasPrefix(strings.ToLower(name), "db_")
}

func (m mssql) DropTable(ns, table string) string { return "DROP TABLE " + m.table(ns, table) }

func (m mssql) DropView(ns, view string) string { return "DROP VIEW " + m.table(ns, view) }

func (m mssql) CreateView(ns, view, query string, replace bool) string {
	return lo.Ternary(replace, "CREATE OR ALTER VIEW ", "CREATE VIEW ") + m.table(ns, view) + " AS " + query
}

func (m mssql) ViewQuery(_ context.Context, db *gorm.DB, ns, view string) (string, error) {
	var definition string
	if err := db.Raw("SELECT OBJECT_DEFINITION(OBJECT_ID(?))", m.table(ns, view)).Scan(&definition).Error; err != nil {
		return "", err
	}

	if match := viewHeaderPattern.FindStringSubmatch(definition); match != nil {
		return strings.TrimSpace(match[3]), nil
	}

	return definition, nil
}

// --- keys, indexes, foreign keys, checks, triggers ---

// Routines lists the stored procedures or the functions (scalar, inline and multi-statement table) of a schema.
func (mssql) Routines(_ context.Context, db *gorm.DB, namespace string, procedures bool) ([]string, error) {
	types := lo.Ternary(procedures, "'P', 'PC'", "'FN', 'IF', 'TF', 'FS', 'FT'")

	var names []string

	err := db.Raw(`SELECT name FROM sys.objects WHERE schema_id = SCHEMA_ID(?) AND is_ms_shipped = 0 AND type IN (`+types+`) ORDER BY name`, namespace).Scan(&names).Error

	return names, err
}

// RoutineDefinition is the routine's CREATE statement as the server stored it; it is NULL for encrypted routines.
func (m mssql) RoutineDefinition(_ context.Context, db *gorm.DB, namespace, name string) (string, error) {
	var def *string

	if err := db.Raw(`SELECT OBJECT_DEFINITION(OBJECT_ID(?))`, m.table(namespace, name)).Scan(&def).Error; err != nil {
		return "", err
	}

	if def == nil {
		return "", fmt.Errorf("the definition of %s is not available (encrypted or missing)", name)
	}

	return *def, nil
}

func (m mssql) DropRoutine(namespace, name string, procedure bool) string {
	return "DROP " + lo.Ternary(procedure, "PROCEDURE ", "FUNCTION ") + m.table(namespace, name)
}
