package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func createIndexStatements(tableName string, indexes []dto.SQLiteIndex) []ddl.Statement {
	statements := make([]ddl.Statement, 0)

	for _, idx := range indexes {
		if idx.New == nil {
			continue
		}

		if idx.Added != nil && !lo.FromPtr(idx.Added) {
			continue
		}

		if query := createIndexStatement(tableName, idx); query != "" {
			statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseIndexes})
		}
	}

	return statements
}

func editIndexStatements(tableName string, indexes []dto.SQLiteIndex) []ddl.Statement {
	statements := make([]ddl.Statement, 0)

	for _, idx := range indexes {
		if idx.Deleted != nil && *idx.Deleted && idx.Old != nil && idx.Old.Name != nil {
			statements = append(statements, ddl.Statement{
				SQL:   fmt.Sprintf("DROP INDEX IF EXISTS %s", quote.SqliteIdent(*idx.Old.Name)),
				Phase: ddl.PhaseIndexes,
			})

			continue
		}

		if idx.Added != nil && *idx.Added {
			if query := createIndexStatement(tableName, idx); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseIndexes})
			}

			continue
		}

		if isIndexRenamed(idx) {
			statements = append(statements, ddl.Statement{
				SQL:   fmt.Sprintf("DROP INDEX IF EXISTS %s", quote.SqliteIdent(*idx.Old.Name)),
				Phase: ddl.PhaseIndexes,
			})

			if query := createIndexStatement(tableName, idx); query != "" {
				statements = append(statements, ddl.Statement{SQL: query, Phase: ddl.PhaseIndexes})
			}
		}
	}

	return statements
}

func createIndexStatement(tableName string, idx dto.SQLiteIndex) string {
	unique := ""
	if idx.New.Unique != nil && *idx.New.Unique {
		unique = "UNIQUE "
	}

	name := lo.FromPtr(idx.New.Name)
	if name == "" {
		name = fmt.Sprintf("%s_%s_idx", tableName, strings.Join(idx.New.Columns, "_"))
	}

	order := ""
	if parsed := ddl.IndexOrder(lo.FromPtr(idx.New.Order)); parsed != "" {
		order = " " + parsed
	}

	cols := make([]string, len(idx.New.Columns))
	for i, c := range idx.New.Columns {
		cols[i] = quote.SqliteIdent(c) + order
	}

	return fmt.Sprintf("CREATE %sINDEX %s ON %s (%s)",
		unique, quote.SqliteIdent(name), quote.SqliteIdent(tableName), strings.Join(cols, ", "))
}
