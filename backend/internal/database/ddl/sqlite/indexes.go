package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// indexStatements plans the Indexes tab. When the table is recreated its
// indexes are gone, so every row that is not deleted is created again;
// otherwise only the changed rows are applied in place.
func indexStatements(tableName string, rows []dto.SQLiteIndex, recreate bool) ([]ddl.Statement, error) {
	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseIndexes})
	}

	for _, idx := range rows {
		switch {
		case lo.FromPtr(idx.Deleted):
			if !recreate && idx.Old != nil && lo.FromPtr(idx.Old.Name) != "" {
				add("DROP INDEX IF EXISTS " + quote.SqliteIdent(*idx.Old.Name))
			}
		case idx.New == nil:
		case recreate || lo.FromPtr(idx.Added):
			query, err := createIndexStatement(tableName, idx.New)
			if err != nil {
				return nil, err
			}

			add(query)
		case idx.Old != nil && indexChanged(idx.Old, idx.New):
			if lo.FromPtr(idx.Old.Name) != "" {
				add("DROP INDEX IF EXISTS " + quote.SqliteIdent(*idx.Old.Name))
			}

			query, err := createIndexStatement(tableName, idx.New)
			if err != nil {
				return nil, err
			}

			add(query)
		}
	}

	return statements, nil
}

func indexChanged(oldIndex, newIndex *dto.SQLiteIndexData) bool {
	return lo.FromPtr(oldIndex.Name) != lo.FromPtr(newIndex.Name) ||
		lo.FromPtr(oldIndex.Unique) != lo.FromPtr(newIndex.Unique) ||
		ddl.IndexOrder(lo.FromPtr(oldIndex.Order)) != ddl.IndexOrder(lo.FromPtr(newIndex.Order)) ||
		!ddl.StringSlicesEqual(oldIndex.Columns, newIndex.Columns)
}

func createIndexStatement(tableName string, idx *dto.SQLiteIndexData) (string, error) {
	name := lo.FromPtr(idx.Name)
	if name == "" {
		return "", fmt.Errorf("index needs a name")
	}

	if len(idx.Columns) == 0 {
		return "", fmt.Errorf("index %q needs at least one column", name)
	}

	unique := ""
	if lo.FromPtr(idx.Unique) {
		unique = "UNIQUE "
	}

	order := ""
	if parsed := ddl.IndexOrder(lo.FromPtr(idx.Order)); parsed != "" {
		order = " " + parsed
	}

	cols := make([]string, len(idx.Columns))
	for i, c := range idx.Columns {
		cols[i] = quote.SqliteIdent(c) + order
	}

	return fmt.Sprintf("CREATE %sINDEX %s ON %s (%s)",
		unique, quote.SqliteIdent(name), quote.SqliteIdent(tableName), strings.Join(cols, ", ")), nil
}
