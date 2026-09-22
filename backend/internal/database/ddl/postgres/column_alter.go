package ddlPostgres

import (
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func columnStatements(input TableInput, tableName string) []ddl.Statement {
	tableRef := quote.PostgresQualifiedTable(input.Schema, tableName)
	alter := "ALTER TABLE " + tableRef

	var statements []ddl.Statement

	for _, column := range columnRows(input) {
		if column.New == nil {
			continue
		}

		if lo.FromPtr(column.Deleted) {
			name := column.New.Name
			if column.Old != nil && column.Old.Name != nil {
				name = column.Old.Name
			}

			if name != nil {
				statements = append(statements, ddl.Statement{
					SQL:   alter + " DROP COLUMN " + quote.PostgresIdent(*name),
					Phase: ddl.PhaseColumns,
				})
			}

			continue
		}

		if lo.FromPtr(column.Added) {
			if column.New.Name == nil || column.New.DataType == nil {
				continue
			}

			def := "ALTER TABLE " + tableRef + " ADD COLUMN " + columnDefinition(column.New)
			statements = append(statements, ddl.Statement{SQL: def, Phase: ddl.PhaseColumns})

			if column.New.Comment != nil && *column.New.Comment != "" {
				statements = append(statements, commentOnColumnStatement(
					input.Schema, tableName, *column.New.Name, *column.New.Comment))
			}

			continue
		}

		if column.New.Name == nil || column.New.DataType == nil {
			continue
		}

		statements = append(statements, editColumnStatements(alter, input, tableName, column)...)
	}

	return statements
}

func editColumnStatements(alter string, input TableInput, tableName string, column dto.PostgresTableColumn) []ddl.Statement {
	var statements []ddl.Statement

	add := func(sql string) {
		statements = append(statements, ddl.Statement{SQL: sql, Phase: ddl.PhaseColumns})
	}

	name := *column.New.Name
	if column.Old != nil && column.Old.Name != nil {
		name = *column.Old.Name
	}

	if column.Old != nil && column.Old.Name != nil && *column.Old.Name != *column.New.Name {
		add(alter + " RENAME COLUMN " + quote.PostgresIdent(*column.Old.Name) +
			" TO " + quote.PostgresIdent(*column.New.Name))
		name = *column.New.Name
	}

	if columnTypeChanged(column.Old, column.New) {
		dataTypeQuery := alter + " ALTER COLUMN " + quote.PostgresIdent(name) +
			" TYPE " + columnTypeSpec(column.New) +
			" USING " + quote.PostgresIdent(name) + "::" + columnTypeSpec(column.New)

		add(dataTypeQuery)
	}

	if column.New.NotNull != nil && (column.Old == nil || column.Old.NotNull == nil || *column.Old.NotNull != *column.New.NotNull) {
		if *column.New.NotNull {
			add(alter + " ALTER COLUMN " + quote.PostgresIdent(name) + " SET NOT NULL")
		} else {
			add(alter + " ALTER COLUMN " + quote.PostgresIdent(name) + " DROP NOT NULL")
		}
	}

	oldDefault := ""
	if column.Old != nil && column.Old.Default != nil {
		oldDefault = *column.Old.Default
	}

	newDefault := lo.FromPtr(column.New.Default)
	if oldDefault != newDefault {
		if expr := ddl.SQLExpression(newDefault); expr != "" {
			add(alter + " ALTER COLUMN " + quote.PostgresIdent(name) + " SET DEFAULT " + expr)
		} else {
			add(alter + " ALTER COLUMN " + quote.PostgresIdent(name) + " DROP DEFAULT")
		}
	}

	oldComment := ""
	if column.Old != nil && column.Old.Comment != nil {
		oldComment = *column.Old.Comment
	}

	newComment := lo.FromPtr(column.New.Comment)
	if oldComment != newComment {
		add(commentOnColumnStatement(input.Schema, tableName, name, newComment).SQL)
	}

	return statements
}

func columnTypeChanged(oldData, newData *dto.PostgresTableColumnData) bool {
	if oldData == nil || oldData.DataType == nil || newData == nil || newData.DataType == nil {
		return false
	}

	return !strings.EqualFold(columnTypeSpec(oldData), columnTypeSpec(newData))
}
