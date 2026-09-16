package ddlMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// indexStatements builds the indexes phase; edits that change the
// definition are handled as drop + recreate by the caller's diffing.
func indexStatements(database, tableName string, rows []dto.MysqlTableIndex, action contract.TreeNodeActionName) []ddl.Statement {
	var statements []ddl.Statement

	for _, index := range rows {
		if index.New == nil {
			continue
		}

		if action == contract.CreateTableAction || lo.FromPtr(index.Added) {
			if query := createIndexStatement(database, tableName, index.New); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseIndexes})
			}

			continue
		}

		if lo.FromPtr(index.Deleted) && index.Old != nil && index.Old.IndexName != nil {
			statements = append(statements, ddl.Statement{
				SQL:   dropIndexStatement(database, tableName, *index.Old.IndexName),
				Phase: ddl.PhaseIndexes,
			})
		}
	}

	return statements
}

func createIndexStatement(database, table string, index *dto.MysqlTableIndexData) string {
	if index == nil || index.IndexName == nil || len(index.Columns) == 0 {
		return ""
	}

	unique := ""
	if index.NonUnique != nil && !*index.NonUnique {
		unique = "UNIQUE "
	}

	collation := "A"
	if index.Collation != nil && *index.Collation != "" {
		collation = *index.Collation
	}

	colParts := make([]string, len(index.Columns))
	for i, col := range index.Columns {
		if collation == "D" {
			colParts[i] = quote.MysqlIdent(col) + " DESC"
		} else {
			colParts[i] = quote.MysqlIdent(col) + " ASC"
		}
	}

	return "CREATE " + unique + "INDEX " + quote.MysqlIdent(*index.IndexName) +
		" ON " + quote.MysqlQualifiedTable(database, table) +
		" (" + strings.Join(colParts, ", ") + ")"
}

func dropIndexStatement(database, table, name string) string {
	return "DROP INDEX " + quote.MysqlIdent(name) + " ON " + quote.MysqlQualifiedTable(database, table)
}
