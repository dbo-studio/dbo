package ddlPostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func buildEditTablePlan(input TableInput) (ddl.Plan, string, error) {
	general := input.General

	tableName := input.NodeTable
	if general != nil && general.Old != nil && general.Old.Name != nil && *general.Old.Name != "" {
		tableName = *general.Old.Name
	}

	if tableName == "" {
		return nil, "", fmt.Errorf("missing table name")
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

		if persistence := ddl.PostgresPersistence(lo.FromPtr(general.New.Persistence)); persistence == "LOGGED" || persistence == "UNLOGGED" {
			oldPersistence := ""
			if old != nil {
				oldPersistence = ddl.PostgresPersistence(lo.FromPtr(old.Persistence))
			}

			if oldPersistence != persistence {
				addTable("ALTER TABLE " + tableRef + " SET " + persistence)
			}
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
