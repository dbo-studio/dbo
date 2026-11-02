package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func checkRows(input TableInput) []dto.SQLiteCheck {
	if input.CheckParams == nil {
		return nil
	}

	return input.CheckParams.Checks
}

// checkDefinitions renders the table-level CHECK constraints for CREATE TABLE.
// SQLite cannot add or drop a CHECK in place; the caller recreates the table.
func checkDefinitions(rows []dto.SQLiteCheck) ([]string, error) {
	var defs []string

	for _, check := range rows {
		if lo.FromPtr(check.Deleted) || check.New == nil {
			continue
		}

		expression := ddl.SQLExpression(lo.FromPtr(check.New.Expression))
		if expression == "" {
			return nil, fmt.Errorf("check %q: expression must be a single SQL expression without ';' or comments", lo.FromPtr(check.New.Name))
		}

		def := "CHECK (" + expression + ")"
		if name := strings.TrimSpace(lo.FromPtr(check.New.Name)); name != "" {
			def = "CONSTRAINT " + quote.SqliteIdent(name) + " " + def
		}

		defs = append(defs, def)
	}

	return defs, nil
}
