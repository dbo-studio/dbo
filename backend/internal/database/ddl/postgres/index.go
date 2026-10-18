package ddlPostgres

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func indexStatements(schema, tableName string, rows []dto.PostgresTableIndex) []ddl.Statement {
	var statements []ddl.Statement

	for _, index := range rows {
		if !lo.FromPtr(index.Added) || index.New == nil || index.New.IndexName == nil || len(index.New.Columns) == 0 {
			continue
		}

		unique := ""
		if lo.FromPtr(index.New.Unique) {
			unique = "UNIQUE "
		}

		columns := lo.Map(index.New.Columns, func(column string, _ int) string { return quote.PostgresIdent(column) })

		statements = append(statements, ddl.Statement{
			SQL: "CREATE " + unique + "INDEX " + quote.PostgresIdent(*index.New.IndexName) +
				" ON " + quote.PostgresQualifiedTable(schema, tableName) + " (" + strings.Join(columns, ", ") + ")",
			Phase: ddl.PhaseIndexes,
		})
	}

	return statements
}
