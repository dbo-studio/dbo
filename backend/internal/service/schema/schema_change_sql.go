package serviceSchema

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

// opStatement is the one statement of an op in dto.SchemaChangeSQLOps.
func opStatement(connectionType, database, schema string, op dto.SchemaChangeOp) (string, error) {
	if err := validateDialect(connectionType, op); err != nil {
		return "", err
	}

	table := qualifiedTable(connectionType, database, schema, op.Table)
	ident := func(name string) string { return identifier(connectionType, name) }

	switch op.Op {
	case dto.SchemaChangeRenameTable:
		// MySQL would move an unqualified new name into the session's default database.
		to := ident(op.Name)
		if contract.IsMysqlFamily(connectionType) {
			to = qualifiedTable(connectionType, database, schema, op.Name)
		}

		return "ALTER TABLE " + table + " RENAME TO " + to, nil
	case dto.SchemaChangeRenameColumn:
		return "ALTER TABLE " + table + " RENAME COLUMN " + ident(op.ColumnName) + " TO " + ident(op.Name), nil
	case dto.SchemaChangeCreateView:
		body, err := sqlguard.SelectStatement(op.SQL)
		if err != nil {
			return "", err
		}

		return "CREATE VIEW " + qualifiedTable(connectionType, database, schema, op.Name) + " AS " + body, nil
	case dto.SchemaChangeDropView:
		return "DROP VIEW " + qualifiedTable(connectionType, database, schema, op.Name), nil
	case dto.SchemaChangeAddCheck:
		return "ALTER TABLE " + table + " ADD CONSTRAINT " + ident(op.Name) + " CHECK (" + op.SQL + ")", nil
	case dto.SchemaChangeDropConstraint:
		return "ALTER TABLE " + table + " DROP CONSTRAINT " + ident(op.Name), nil
	case dto.SchemaChangeDropTable:
		return "DROP TABLE " + table, nil
	default:
		return "", fmt.Errorf("%s is not a statement op", op.Op)
	}
}

// validateDialect refuses ops the engine cannot run.
func validateDialect(connectionType string, op dto.SchemaChangeOp) error {
	if connectionType == string(contract.Sqlite) && (op.Op == dto.SchemaChangeAddCheck || op.Op == dto.SchemaChangeDropConstraint) {
		return fmt.Errorf("SQLite cannot add or drop constraints on an existing table; recreate the table in the table editor instead")
	}

	return nil
}
