package ddlMysql

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func checkRows(input TableInput) []dto.MysqlTableCheck {
	if input.Checks == nil {
		return nil
	}

	return input.Checks.Columns
}

// checkStatements plans the Checks tab. MySQL cannot change a CHECK in place,
// so an edit drops and re-adds it. The new definition is added under a
// temporary name first, so a rejected expression fails while the original is
// still in place.
func checkStatements(input TableInput, tableName string) ([]ddl.Statement, error) {
	alter := "ALTER TABLE " + quote.MysqlQualifiedTable(input.Database, tableName)

	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseChecks})
	}

	create := func(name string, check *dto.MysqlTableCheckData) error {
		expression := ddl.SQLExpression(lo.FromPtr(check.Expression))
		if expression == "" {
			return fmt.Errorf("check %q: expression must be a single SQL expression without ';' or comments", name)
		}

		add(alter + " ADD CONSTRAINT " + quote.MysqlIdent(name) + " CHECK (" + expression + ")")

		return nil
	}

	drop := func(name string) {
		// MariaDB has no DROP CHECK; MySQL accepts it on every version that has checks.
		keyword := lo.Ternary(input.MariaDB, "DROP CONSTRAINT ", "DROP CHECK ")
		add(alter + " " + keyword + quote.MysqlIdent(name))
	}

	for _, check := range checkRows(input) {
		switch {
		case lo.FromPtr(check.Deleted):
			if check.Old != nil && lo.FromPtr(check.Old.Name) != "" {
				drop(*check.Old.Name)
			}
		case check.New == nil:
		case lo.FromPtr(check.New.Name) == "":
			return nil, fmt.Errorf("check constraint needs a name")
		case input.Action == contract.CreateTableAction || lo.FromPtr(check.Added):
			if err := create(*check.New.Name, check.New); err != nil {
				return nil, err
			}
		case check.Old != nil && (lo.FromPtr(check.Old.Name) != *check.New.Name || !ddl.PtrStringsEqual(check.Old.Expression, check.New.Expression)):
			probe := validationName(*check.New.Name)

			if err := create(probe, check.New); err != nil {
				return nil, err
			}

			drop(probe)

			if lo.FromPtr(check.Old.Name) != "" {
				drop(*check.Old.Name)
			}

			if err := create(*check.New.Name, check.New); err != nil {
				return nil, err
			}
		}
	}

	return statements, nil
}
