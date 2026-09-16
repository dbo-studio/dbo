package ddlPostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

// columnDefinition builds the inline CREATE TABLE definition of one column.
func columnDefinition(col *dto.PostgresTableColumnData) string {
	def := quote.PostgresIdent(*col.Name) + " " + columnTypeSpec(col)

	if lo.FromPtr(col.NotNull) {
		def += " NOT NULL"
	}

	isIdentity := lo.FromPtr(col.IsIdentity)
	isGenerated := lo.FromPtr(col.IsGenerated)

	// Generated / identity columns use the default field as the expression
	// (or IDENTITY clause), not a plain DEFAULT — emitting both is invalid.
	if !isGenerated && !isIdentity && col.Default != nil {
		def += " DEFAULT " + *col.Default
	}

	if isIdentity {
		def += " GENERATED ALWAYS AS IDENTITY"
	}

	if isGenerated && col.Default != nil && *col.Default != "" {
		def += " GENERATED ALWAYS AS (" + *col.Default + ") STORED"
	}

	return def
}

// columnTypeSpec renders the data type with length/scale where the type
// supports them.
func columnTypeSpec(col *dto.PostgresTableColumnData) string {
	dataType := *col.DataType
	if col.MaxLength == nil {
		return dataType
	}

	switch {
	case databaseCore.IsCharacterType(dataType):
		return fmt.Sprintf("%s(%d)", dataType, *col.MaxLength)
	case databaseCore.IsNumericType(dataType) && col.NumericScale != nil:
		return fmt.Sprintf("%s(%d,%d)", dataType, *col.MaxLength, *col.NumericScale)
	default:
		return dataType
	}
}

// columnStatements builds the columns phase for the edit flow.
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

	if column.Old != nil && column.Old.DataType != nil && column.New.DataType != nil &&
		*column.Old.DataType != *column.New.DataType {
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
		if newDefault != "" {
			add(alter + " ALTER COLUMN " + quote.PostgresIdent(name) + " SET DEFAULT " + newDefault)
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

func commentOnTableStatement(schema, table, comment string) ddl.Statement {
	return ddl.Statement{
		SQL:   "COMMENT ON TABLE " + quote.PostgresQualifiedTable(schema, table) + " IS " + quote.PostgresLiteral(comment),
		Phase: ddl.PhaseTable,
	}
}

func commentOnColumnStatement(schema, table, column, comment string) ddl.Statement {
	return ddl.Statement{
		SQL: "COMMENT ON COLUMN " + quote.PostgresQualifiedTable(schema, table) + "." +
			quote.PostgresIdent(column) + " IS " + quote.PostgresLiteral(comment),
		Phase: ddl.PhaseColumns,
	}
}

func commentOnConstraintStatement(constraint, schema, table, comment string) ddl.Statement {
	return ddl.Statement{
		SQL: "COMMENT ON CONSTRAINT " + quote.PostgresIdent(constraint) + " ON " +
			quote.PostgresQualifiedTable(schema, table) + " IS " + quote.PostgresLiteral(comment),
		Phase: ddl.PhaseKeys,
	}
}
