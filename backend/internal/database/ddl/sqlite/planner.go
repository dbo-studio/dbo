package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// TableInput carries the parsed Object Form payload for a SQLite table
// create/edit action.
type TableInput struct {
	TableParams      *dto.SQLiteTableParams
	ColumnParams     *dto.SQLiteTableColumnParams
	ForeignKeyParams *dto.SQLiteTableForeignKeyParams
	KeyParams        *dto.SQLiteTableKeyParams
	IndexParams      *dto.SQLiteIndexParams
}

// BuildCreatePlan composes a single CREATE TABLE with columns, keys and
// foreign keys inline, followed by the index statements.
func BuildCreatePlan(input TableInput) ddl.Plan {
	tableName := lo.FromPtr(tableNewName(input.TableParams))

	plan := ddl.Plan{{
		SQL:   buildCreateTableQuery(quote.SqliteIdent(tableName), tableNewData(input.TableParams), allColumnDefinitions(input)),
		Phase: ddl.PhaseTable,
	}}

	plan = append(plan, createIndexStatements(tableName, indexRows(input))...)

	return plan
}

// BuildEditPlan composes the SQLite table-recreate flow (SQLite cannot
// alter most table attributes in place). The tmp table name is reserved by
// the driver, which owns the database access needed to make it unique.
func BuildEditPlan(input TableInput, tmpTableName string) (ddl.Plan, error) {
	if input.TableParams == nil || input.TableParams.Old == nil || input.TableParams.Old.Name == nil {
		return nil, fmt.Errorf("missing old table name")
	}

	oldName := *input.TableParams.Old.Name
	newName := newTableName(input.TableParams, oldName)

	columnDefs := allColumnDefinitions(input)
	if columnDefs == "" {
		return nil, fmt.Errorf("table %s has no column definitions", oldName)
	}

	plan := recreateTableStatements(tmpTableName, oldName, newName, tableNewData(input.TableParams), columnDefs, input)
	plan = append(plan, editIndexStatements(newName, indexRows(input))...)

	return plan, nil
}

func tableNewName(params *dto.SQLiteTableParams) *string {
	if params == nil || params.New == nil {
		return nil
	}

	return params.New.Name
}

func tableNewData(params *dto.SQLiteTableParams) *dto.SQLiteTableParamsData {
	if params == nil {
		return nil
	}

	return params.New
}

func newTableName(params *dto.SQLiteTableParams, oldName string) string {
	if name := lo.FromPtr(tableNewName(params)); name != "" {
		return name
	}

	return oldName
}

func allColumnDefinitions(input TableInput) string {
	var parts []string

	if defs := columnDefinitions(filterActiveColumns(columnRows(input))); defs != "" {
		parts = append(parts, defs)
	}

	if defs := foreignKeyDefinitions(foreignKeyRows(input)); defs != "" {
		parts = append(parts, defs)
	}

	if defs := keyDefinitions(keyRows(input)); defs != "" {
		parts = append(parts, defs)
	}

	return strings.Join(parts, ", ")
}

func recreateTableStatements(tmpTableName, oldName, newName string, tableParams *dto.SQLiteTableParamsData, columnDefs string, input TableInput) ddl.Plan {
	plan := ddl.Plan{{
		SQL:   buildCreateTableQuery(quote.SqliteIdent(tmpTableName), tableParams, columnDefs),
		Phase: ddl.PhaseTable,
	}}

	if commonColumns := commonColumns(columnRows(input)); len(commonColumns) > 0 {
		plan = append(plan, ddl.Statement{
			SQL:   fmt.Sprintf("INSERT INTO %s (%s) SELECT %s FROM %s", quote.SqliteIdent(tmpTableName), strings.Join(commonColumns, ", "), strings.Join(commonColumns, ", "), quote.SqliteIdent(oldName)),
			Phase: ddl.PhaseTable,
		})
	}

	plan = append(plan,
		ddl.Statement{SQL: fmt.Sprintf("DROP TABLE %s", quote.SqliteIdent(oldName)), Phase: ddl.PhaseTable},
		ddl.Statement{
			SQL:   fmt.Sprintf("ALTER TABLE %s RENAME TO %s", quote.SqliteIdent(tmpTableName), quote.SqliteIdent(newName)),
			Phase: ddl.PhaseTable,
		},
	)

	return plan
}

func buildCreateTableQuery(tableName string, params *dto.SQLiteTableParamsData, columnDefs string) string {
	var parts []string

	if params != nil && params.Temporary != nil && *params.Temporary {
		parts = append(parts, "CREATE TEMPORARY TABLE")
	} else {
		parts = append(parts, "CREATE TABLE")
	}

	parts = append(parts, tableName)

	if columnDefs != "" {
		parts = append(parts, fmt.Sprintf("(%s)", columnDefs))
	}

	var tableOptions []string

	if params != nil {
		if params.WithoutRowid != nil && *params.WithoutRowid {
			tableOptions = append(tableOptions, "WITHOUT ROWID")
		}

		if params.Strict != nil && *params.Strict {
			tableOptions = append(tableOptions, "STRICT")
		}
	}

	if len(tableOptions) > 0 {
		parts = append(parts, strings.Join(tableOptions, ", "))
	}

	return strings.Join(parts, " ")
}
