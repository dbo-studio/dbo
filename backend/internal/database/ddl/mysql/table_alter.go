package ddlMysql

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

	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)

	plan := ddl.Plan{}
	addTable := func(sql string) {
		plan = append(plan, ddl.Statement{SQL: sql, Phase: ddl.PhaseTable})
	}

	if general != nil && general.New != nil {
		old := general.Old

		if general.New.Name != nil && (old == nil || old.Name == nil || *old.Name != *general.New.Name) {
			addTable("ALTER TABLE " + tableRef + " RENAME TO " + quote.MysqlIdent(*general.New.Name))
			tableName = *general.New.Name
			tableRef = quote.MysqlQualifiedTable(input.Database, tableName)
		}

		if engine := mysqlEngine(lo.FromPtr(general.New.Engine)); engine != "" &&
			(old == nil || mysqlEngine(lo.FromPtr(old.Engine)) != engine) {
			addTable("ALTER TABLE " + tableRef + " ENGINE=" + engine)
		}

		if rowFormat := mysqlRowFormat(lo.FromPtr(general.New.RowFormat)); rowFormat != "" &&
			(old == nil || mysqlRowFormat(lo.FromPtr(old.RowFormat)) != rowFormat) {
			addTable("ALTER TABLE " + tableRef + " ROW_FORMAT=" + rowFormat)
		}

		if general.New.Comment != nil && *general.New.Comment != "" &&
			(old == nil || old.Comment == nil || *old.Comment != *general.New.Comment) {
			addTable("ALTER TABLE " + tableRef + " COMMENT=" + quote.MysqlLiteral(*general.New.Comment))
		}
	}

	plan = append(plan, columnStatements(input, tableName)...)
	plan = append(plan, keyStatements(input, tableName)...)
	plan = append(plan, indexStatements(input.Database, tableName, indexRows(input), input.Action)...)
	plan = append(plan, foreignKeyStatements(input.Database, tableName, foreignKeyRows(input), input.Action)...)

	return plan, tableName, nil
}
