package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) handleDatabaseCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	oldFields, err := r.getDatabaseInfo(node)
	if err != nil {
		return nil, err
	}

	if action == contract.CreateDatabaseAction {
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresDatabaseParams](params)
		if err != nil {
			return nil, err
		}

		params := dto[tabId]

		query := fmt.Sprintf("CREATE DATABASE %s", *params.Name)
		if params.Owner != nil {
			query += fmt.Sprintf(" OWNER %s", *params.Owner)
		}
		if params.Template != nil {
			query += fmt.Sprintf(" TEMPLATE %s", *params.Template)
		}
		if params.Tablespace != nil {
			query += fmt.Sprintf(" TABLESPACE %s", *params.Tablespace)
		}

		queries = append(queries, query)

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS '%s'", *params.Name, *params.Comment))
		}
	}

	if action == contract.EditDatabaseAction {
		params, err := convertToDTO[dto.PostgresDatabaseParams](params)
		params = compareAndSetNil(params, oldFields)

		if err != nil {
			return nil, err
		}

		if params.Name != nil {
			query := fmt.Sprintf("ALTER DATABASE %s RENAME TO %s", findField(oldFields, "datname"), *params.Name)
			queries = append(queries, query)
		}

		if params.Owner != nil {
			query := fmt.Sprintf("ALTER DATABASE %s OWNER TO %s", findField(oldFields, "datname"), *params.Owner)
			queries = append(queries, query)
		}

		if params.Tablespace != nil {
			query := fmt.Sprintf("ALTER DATABASE %s SET tablespace = %s", findField(oldFields, "datname"), *params.Tablespace)
			queries = append(queries, query)
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS %s", findField(oldFields, "datname"), *params.Comment))
		}
	}

	if action == contract.DropDatabaseAction {
		query := fmt.Sprintf("DROP DATABASE %s", node.Database)
		queries = append(queries, query)
	}

	return queries, nil
}
