package ddlMysql

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

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

			continue
		}

		if index.Old != nil && indexDefinitionChanged(index.Old, index.New) {
			if index.Old.IndexName != nil {
				statements = append(statements, ddl.Statement{
					SQL:   dropIndexStatement(database, tableName, *index.Old.IndexName),
					Phase: ddl.PhaseIndexes,
				})
			}

			if query := createIndexStatement(database, tableName, index.New); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseIndexes})
			}
		}
	}

	return statements
}

func indexDefinitionChanged(oldIndex, newIndex *dto.MysqlTableIndexData) bool {
	if oldIndex == nil || newIndex == nil {
		return true
	}

	if lo.FromPtr(oldIndex.IndexName) != lo.FromPtr(newIndex.IndexName) {
		return true
	}

	if lo.FromPtr(oldIndex.NonUnique) != lo.FromPtr(newIndex.NonUnique) {
		return true
	}

	if lo.FromPtr(oldIndex.Collation) != lo.FromPtr(newIndex.Collation) {
		return true
	}

	return !ddl.StringSlicesEqual(oldIndex.Columns, newIndex.Columns)
}

func createIndexStatement(database, table string, index *dto.MysqlTableIndexData) string {
	if index == nil || index.IndexName == nil || len(index.Columns) == 0 {
		return ""
	}

	unique := ""
	if index.NonUnique != nil && !*index.NonUnique {
		unique = "UNIQUE "
	}

	order := "ASC"

	if index.Collation != nil {
		if parsed := ddl.IndexOrder(*index.Collation); parsed != "" {
			order = parsed
		} else if *index.Collation == "D" {
			order = "DESC"
		} else if *index.Collation == "A" {
			order = "ASC"
		}
	}

	colParts := make([]string, len(index.Columns))
	for i, col := range index.Columns {
		colParts[i] = quote.MysqlIdent(col) + " " + order
	}

	return "CREATE " + unique + "INDEX " + quote.MysqlIdent(*index.IndexName) +
		" ON " + quote.MysqlQualifiedTable(database, table) +
		" (" + strings.Join(colParts, ", ") + ")"
}

func dropIndexStatement(database, table, name string) string {
	return "DROP INDEX " + quote.MysqlIdent(name) + " ON " + quote.MysqlQualifiedTable(database, table)
}
