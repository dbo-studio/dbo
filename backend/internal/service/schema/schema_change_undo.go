package serviceSchema

import (
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
)

// CompensatingSQL is the SQL that takes back applied ops, in the order it must
// run. Only ops that add something can be taken back: altering or dropping a
// column loses what the column was, and SQLite cannot drop a foreign key.
func CompensatingSQL(connectionType, database, schema string, ops []dto.SchemaChangeOp) []string {
	created := map[string]bool{}

	for _, op := range ops {
		if op.Op == dto.SchemaChangeCreateTable {
			created[op.Table] = true
		}
	}

	table := func(name string) string {
		switch {
		case contract.IsPostgresFamily(connectionType):
			return quote.PostgresQualifiedTable(schema, name)
		case contract.IsMysqlFamily(connectionType):
			return quote.MysqlQualifiedTable(database, name)
		default:
			return quote.SqliteIdent(name)
		}
	}
	ident := func(name string) string {
		switch {
		case contract.IsPostgresFamily(connectionType):
			return quote.PostgresIdent(name)
		case contract.IsMysqlFamily(connectionType):
			return quote.MysqlIdent(name)
		default:
			return quote.SqliteIdent(name)
		}
	}

	statements := []string{}

	reversed := slices.Clone(ops)
	slices.Reverse(reversed)

	for _, op := range reversed {
		// Dropping a created table takes its columns, indexes and keys with it.
		if created[op.Table] && op.Op != dto.SchemaChangeCreateTable {
			continue
		}

		switch op.Op {
		case dto.SchemaChangeCreateTable:
			statements = append(statements, "DROP TABLE "+table(op.Table))
		case dto.SchemaChangeAddColumn:
			statements = append(statements, "ALTER TABLE "+table(op.Table)+" DROP COLUMN "+ident(op.Column.Name))
		case dto.SchemaChangeAddIndex:
			statements = append(statements, dropIndex(connectionType, schema, table(op.Table), op.IndexName()))
		case dto.SchemaChangeAddForeignKey:
			if connectionType == string(contract.Sqlite) {
				continue
			}

			drop := " DROP CONSTRAINT "
			if contract.IsMysqlFamily(connectionType) {
				drop = " DROP FOREIGN KEY "
			}

			statements = append(statements, "ALTER TABLE "+table(op.Table)+drop+ident(op.ForeignKeyName()))
		}
	}

	return statements
}

func dropIndex(connectionType, schema, table, name string) string {
	switch {
	case contract.IsPostgresFamily(connectionType):
		return "DROP INDEX " + quote.PostgresQualifiedTable(schema, name)
	case contract.IsMysqlFamily(connectionType):
		return "DROP INDEX " + quote.MysqlIdent(name) + " ON " + table
	default:
		return "DROP INDEX " + quote.SqliteIdent(name)
	}
}
