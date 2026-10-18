package ddlPostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func indexRows(input TableInput) []dto.PostgresTableIndex {
	if input.Indexes == nil {
		return nil
	}

	return input.Indexes.Columns
}

// indexStatements plans the Indexes tab. Edits drop and recreate the index
// (PG cannot alter columns, method or predicate in place); a pure rename or
// comment change is applied in place.
func indexStatements(schema, tableName string, rows []dto.PostgresTableIndex, action contract.TreeNodeActionName) []ddl.Statement {
	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseIndexes})
	}

	for _, index := range rows {
		if index.New == nil && !lo.FromPtr(index.Deleted) {
			continue
		}

		switch {
		case action == contract.CreateTableAction || lo.FromPtr(index.Added):
			statements = append(statements, createIndexStatements(schema, tableName, index.New)...)
		case lo.FromPtr(index.Deleted):
			if index.Old != nil && lo.FromPtr(index.Old.Name) != "" {
				add(dropIndexStatement(schema, *index.Old.Name))
			}
		case index.Old != nil && indexDefinitionChanged(index.Old, index.New):
			if lo.FromPtr(index.Old.Name) != "" {
				add(dropIndexStatement(schema, *index.Old.Name))
			}

			statements = append(statements, createIndexStatements(schema, tableName, index.New)...)
		case index.Old != nil:
			oldName, newName := lo.FromPtr(index.Old.Name), lo.FromPtr(index.New.Name)
			if newName != "" && oldName != newName {
				add("ALTER INDEX " + quote.PostgresQualifiedTable(schema, oldName) + " RENAME TO " + quote.PostgresIdent(newName))
			}

			if index.New.Comment != nil && !ddl.PtrStringsEqual(index.Old.Comment, index.New.Comment) && newName != "" {
				add(commentOnIndex(schema, newName, *index.New.Comment))
			}
		}
	}

	return statements
}

func indexDefinitionChanged(oldIndex, newIndex *dto.PostgresTableIndexData) bool {
	if lo.FromPtr(oldIndex.Unique) != lo.FromPtr(newIndex.Unique) {
		return true
	}

	if methodOrDefault(oldIndex.Method) != methodOrDefault(newIndex.Method) {
		return true
	}

	if !ddl.PtrStringsEqual(oldIndex.Where, newIndex.Where) {
		return true
	}

	return !ddl.StringSlicesEqual(oldIndex.Columns, newIndex.Columns)
}

func methodOrDefault(method *string) string {
	if parsed := ddl.PostgresIndexMethod(lo.FromPtr(method)); parsed != "" {
		return parsed
	}

	return "btree"
}

func createIndexStatements(schema, table string, index *dto.PostgresTableIndexData) []ddl.Statement {
	if index == nil || lo.FromPtr(index.Name) == "" || len(index.Columns) == 0 {
		return nil
	}

	query := "CREATE "
	if lo.FromPtr(index.Unique) {
		query += "UNIQUE "
	}

	query += "INDEX " + quote.PostgresIdent(*index.Name) +
		" ON " + quote.PostgresQualifiedTable(schema, table) +
		" USING " + methodOrDefault(index.Method) +
		" (" + ddl.JoinQuoted(index.Columns, quote.PostgresIdent) + ")"

	if where := ddl.SQLExpression(lo.FromPtr(index.Where)); where != "" {
		query += " WHERE " + where
	}

	statements := []ddl.Statement{{SQL: query, Phase: ddl.PhaseIndexes}}

	if lo.FromPtr(index.Comment) != "" {
		statements = append(statements, ddl.Statement{
			SQL:   commentOnIndex(schema, *index.Name, *index.Comment),
			Phase: ddl.PhaseIndexes,
		})
	}

	return statements
}

func dropIndexStatement(schema, name string) string {
	return "DROP INDEX " + quote.PostgresQualifiedTable(schema, name)
}

func commentOnIndex(schema, name, comment string) string {
	return "COMMENT ON INDEX " + quote.PostgresQualifiedTable(schema, name) + " IS " + quote.PostgresLiteral(comment)
}
