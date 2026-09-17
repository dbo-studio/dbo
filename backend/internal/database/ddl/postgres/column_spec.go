package ddlPostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func columnDefinition(col *dto.PostgresTableColumnData) string {
	def := quote.PostgresIdent(*col.Name) + " " + columnTypeSpec(col)

	if lo.FromPtr(col.NotNull) {
		def += " NOT NULL"
	}

	isIdentity := lo.FromPtr(col.IsIdentity)
	isGenerated := lo.FromPtr(col.IsGenerated)

	if !isGenerated && !isIdentity && col.Default != nil {
		if expr := ddl.SQLExpression(*col.Default); expr != "" {
			def += " DEFAULT " + expr
		}
	}

	if isIdentity {
		def += " GENERATED ALWAYS AS IDENTITY"
	}

	if isGenerated && col.Default != nil && *col.Default != "" {
		if expr := ddl.SQLExpression(*col.Default); expr != "" {
			def += " GENERATED ALWAYS AS (" + expr + ") STORED"
		}
	}

	return def
}

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
