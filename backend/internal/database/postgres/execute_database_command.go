package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) handleDatabaseCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateDatabaseAction && action != contract.EditDatabaseAction && action != contract.DropDatabaseAction {
		return queries, nil
	}

	if action == contract.DropDatabaseAction {
		if node.Database == "" {
			return queries, nil
		}

		queries = append(queries, fmt.Sprintf("DROP DATABASE %s WITH (FORCE)", node.Database))

		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresDatabaseParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabID]
	if params == nil {
		return queries, nil
	}

	if action == contract.CreateDatabaseAction {
		if params.New == nil || params.New.Name == nil {
			return queries, nil
		}

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
		if params.Old == nil || params.New == nil || params.Old.Name == nil {
			return queries, nil
		}

		dbName := *params.Old.Name

		if params.New.Name != nil && *params.Old.Name != *params.New.Name {
			queries = append(queries, fmt.Sprintf("ALTER DATABASE %s RENAME TO %s", dbName, *params.New.Name))
			dbName = *params.New.Name
		}

		if params.New.Owner != nil && (params.Old.Owner == nil || *params.Old.Owner != *params.New.Owner) {
			queries = append(queries, fmt.Sprintf("ALTER DATABASE %s OWNER TO %s", dbName, *params.New.Owner))
		}

		if params.New.Tablespace != nil && (params.Old.Tablespace == nil || *params.Old.Tablespace != *params.New.Tablespace) {
			queries = append(queries, fmt.Sprintf("ALTER DATABASE %s SET TABLESPACE = %s", dbName, *params.New.Tablespace))
		}

		if params.New.Comment != nil && (params.Old.Comment == nil || *params.Old.Comment != *params.New.Comment) {
			queries = append(queries, fmt.Sprintf("COMMENT ON DATABASE %s IS '%s'", dbName, *params.New.Comment))
		}
	}

	return queries, nil
}
