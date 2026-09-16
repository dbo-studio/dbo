package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
)

// buildEditTablePlan assembles the edit flow in deterministic phases:
// 1) table metadata alters, 2) columns, 3) keys, 4) foreign keys.
func buildEditTablePlan(input TableInput) (ddl.Plan, string, error) {
	general := input.General

	tableName := input.NodeTable
	if general != nil && general.Old != nil && general.Old.Name != nil && *general.Old.Name != "" {
		tableName = *general.Old.Name
	}

	if tableName == "" {
		return nil, "", nil
	}

	tableRef := quote.PostgresQualifiedTable(input.Schema, tableName)

	plan := ddl.Plan{}
	addTable := func(sql string) {
		plan = append(plan, ddl.Statement{SQL: sql, Phase: ddl.PhaseTable})
	}

	if general != nil && general.New != nil {
		old := general.Old

		if general.New.Name != nil && (old == nil || old.Name == nil || *old.Name != *general.New.Name) {
			addTable("ALTER TABLE " + tableRef + " RENAME TO " + quote.PostgresIdent(*general.New.Name))
			tableName = *general.New.Name
			tableRef = quote.PostgresQualifiedTable(input.Schema, tableName)
		}

		if general.New.Tablespace != nil && (old == nil || old.Tablespace == nil || *old.Tablespace != *general.New.Tablespace) {
			addTable("ALTER TABLE " + tableRef + " SET TABLESPACE " + quote.PostgresIdent(*general.New.Tablespace))
		}

		if general.New.Persistence != nil && (old == nil || old.Persistence == nil || *old.Persistence != *general.New.Persistence) {
			addTable("ALTER TABLE " + tableRef + " SET " + *general.New.Persistence)
		}

		if general.New.Owner != nil && (old == nil || old.Owner == nil || *old.Owner != *general.New.Owner) {
			addTable("ALTER TABLE " + tableRef + " OWNER TO " + quote.PostgresIdent(*general.New.Owner))
		}

		if general.New.Comment != nil && (old == nil || old.Comment == nil || *old.Comment != *general.New.Comment) {
			addTable("COMMENT ON TABLE " + tableRef + " IS " + quote.PostgresLiteral(*general.New.Comment))
		}
	}

	plan = append(plan, columnStatements(input, tableName)...)
	plan = append(plan, keyStatements(input, tableName)...)
	plan = append(plan, foreignKeyStatements(input.Schema, tableName, foreignKeyRows(input), input.Action)...)

	return plan, tableName, nil
}
