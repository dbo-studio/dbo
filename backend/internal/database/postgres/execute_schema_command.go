package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) handleSchemaCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	if action == contract.CreateSchemaAction {
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresSchemaParams](params)
		if err != nil {
			return nil, err
		}
		params := dto[tabId]

		query := fmt.Sprintf("CREATE SCHEMA %s", *params.New.Name)
		if params.New.Owner != nil {
			query += fmt.Sprintf(" AUTHORIZATION %s", *params.New.Owner)
		}

		queries = append(queries, query)

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS '%s'", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.EditSchemaAction {
		params, err := convertToDTO[dto.PostgresSchemaParams](params)

		if err != nil {
			return nil, err
		}

		if params.New.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s RENAME TO %s", *params.Old.Name, *params.New.Name))
		}

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", *params.Old.Owner, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS %s", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.DropSchemaAction {
		query := fmt.Sprintf("DROP SCHEMA %s", node.Schema)
		queries = append(queries, query)
	}

	return queries, nil
}
