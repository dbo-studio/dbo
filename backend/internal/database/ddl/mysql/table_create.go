package ddlMysql

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func buildCreateTablePlan(input TableInput) (ddl.Plan, string, error) {
	general := input.General
	if general == nil || general.New == nil || general.New.Name == nil || *general.New.Name == "" {
		return nil, "", fmt.Errorf("missing table name")
	}

	tableName := *general.New.Name
	tableRef := quote.MysqlQualifiedTable(input.Database, tableName)

	createColumns := lo.Filter(columnRows(input), func(col dto.MysqlTableColumn, _ int) bool {
		return col.New != nil && col.New.Name != nil && col.New.DataType != nil
	})

	if len(createColumns) == 0 {
		return nil, "", fmt.Errorf("missing column definitions")
	}

	columnDefs := lo.Map(createColumns, func(col dto.MysqlTableColumn, _ int) string {
		return inlineColumnDefinition(col.New)
	})

	var tableConstraints []string

	keyConstraints, hasPrimaryKey := inlineKeyConstraints(keyRows(input))
	tableConstraints = append(tableConstraints, keyConstraints...)

	if !hasPrimaryKey {
		pkColumns := lo.FilterMap(createColumns, func(col dto.MysqlTableColumn, _ int) (string, bool) {
			return quote.MysqlIdent(*col.New.Name), lo.FromPtr(col.New.Primary)
		})

		if len(pkColumns) > 0 {
			tableConstraints = append(tableConstraints, "PRIMARY KEY ("+strings.Join(pkColumns, ", ")+")")
		}
	}

	allDefs := append(columnDefs, tableConstraints...)

	createQuery := "CREATE TABLE " + tableRef + " (" + strings.Join(allDefs, ", ") + ")"

	if engine := mysqlEngine(lo.FromPtr(general.New.Engine)); engine != "" {
		createQuery += " ENGINE=" + engine
	}

	if rowFormat := mysqlRowFormat(lo.FromPtr(general.New.RowFormat)); rowFormat != "" {
		createQuery += " ROW_FORMAT=" + rowFormat
	}

	if general.New.Comment != nil && *general.New.Comment != "" {
		createQuery += " COMMENT=" + quote.MysqlLiteral(*general.New.Comment)
	}

	plan := ddl.Plan{{SQL: createQuery, Phase: ddl.PhaseTable}}
	plan = append(plan, indexStatements(input.Database, tableName, indexRows(input), contract.CreateTableAction)...)
	plan = append(plan, foreignKeyStatements(input.Database, tableName, foreignKeyRows(input), contract.CreateTableAction)...)

	return plan, tableName, nil
}
