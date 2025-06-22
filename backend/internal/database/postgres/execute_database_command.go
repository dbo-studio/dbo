package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) handleDatabaseCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateDatabaseAction && action != contract.EditDatabaseAction && action != contract.DropDatabaseAction {
		return queries, nil
	}

	dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresDatabaseParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabId]

	if action == contract.CreateDatabaseAction {
		query := fmt.Sprintf("CREATE DATABASE %s", *params.New.Name)
		if params.New.Owner != nil {
			query += fmt.Sprintf(" WITH OWNER %s", *params.New.Owner)
		}
		if params.New.Template != nil {
			query += fmt.Sprintf(" TEMPLATE %s", *params.New.Template)
		}
		if params.New.Tablespace != nil {
			query += fmt.Sprintf(" TABLESPACE %s", *params.New.Tablespace)
		}

		queries = append(queries, query)

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS '%s'", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.EditDatabaseAction {
		if params.Old.Name != nil && params.New.Name != nil {
			query := fmt.Sprintf("ALTER DATABASE %s RENAME TO %s", *params.Old.Name, *params.New.Name)
			queries = append(queries, query)
			params.Old.Name = params.New.Name
		}

		if params.Old.Name != nil && params.New.Owner != nil {
			query := fmt.Sprintf("ALTER DATABASE %s OWNER TO %s", *params.Old.Name, *params.New.Owner)
			queries = append(queries, query)
		}

		if params.Old.Name != nil && params.New.Tablespace != nil {
			query := fmt.Sprintf("ALTER DATABASE %s SET TABLESPACE = %s", *params.Old.Name, *params.New.Tablespace)
			queries = append(queries, query)
		}

		if params.Old.Name != nil && params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS %s", *params.Old.Name, *params.New.Comment))
		}
	}

	if action == contract.DropDatabaseAction {
		query := fmt.Sprintf("DROP DATABASE %s", node.Database)
		queries = append(queries, query)
	}

	return queries, nil
}
