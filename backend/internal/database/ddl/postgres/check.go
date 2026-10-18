package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func checkRows(input TableInput) []dto.PostgresTableCheck {
	if input.Checks == nil {
		return nil
	}

	return input.Checks.Columns
}

// checkStatements plans the Checks tab. Edits drop and recreate the
// constraint; a comment-only change is applied in place.
func checkStatements(schema, tableName string, rows []dto.PostgresTableCheck, action contract.TreeNodeActionName) []ddl.Statement {
	alter := "ALTER TABLE " + quote.PostgresQualifiedTable(schema, tableName)

	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseChecks})
	}

	create := func(check *dto.PostgresTableCheckData) {
		expression := ddl.SQLExpression(lo.FromPtr(check.Expression))
		if lo.FromPtr(check.Name) == "" || expression == "" {
			return
		}

		add(alter + " ADD CONSTRAINT " + quote.PostgresIdent(*check.Name) + " CHECK (" + expression + ")")

		if lo.FromPtr(check.Comment) != "" {
			add(commentOnConstraintStatement(*check.Name, schema, tableName, *check.Comment).SQL)
		}
	}

	drop := func(name string) {
		add(alter + " DROP CONSTRAINT " + quote.PostgresIdent(name))
	}

	for _, check := range rows {
		switch {
		case lo.FromPtr(check.Deleted):
			if check.Old != nil && lo.FromPtr(check.Old.Name) != "" {
				drop(*check.Old.Name)
			}
		case check.New == nil:
		case action == contract.CreateTableAction || lo.FromPtr(check.Added):
			create(check.New)
		case check.Old != nil:
			if lo.FromPtr(check.Old.Name) != lo.FromPtr(check.New.Name) || !ddl.PtrStringsEqual(check.Old.Expression, check.New.Expression) {
				if lo.FromPtr(check.Old.Name) != "" {
					drop(*check.Old.Name)
				}

				create(check.New)
			} else if !ddl.PtrStringsEqual(check.Old.Comment, check.New.Comment) && lo.FromPtr(check.New.Name) != "" {
				add(commentOnConstraintStatement(*check.New.Name, schema, tableName, lo.FromPtr(check.New.Comment)).SQL)
			}
		}
	}

	return statements
}
