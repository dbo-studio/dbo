package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) handleSchemaCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	oldFields, err := r.getSchemaInfo(node)
	if err != nil {
		return nil, err
	}

	if action == contract.CreateSchemaAction {
		dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresSchemaParams](params)
		if err != nil {
			return nil, err
		}
		params := dto[tabId]

		query := fmt.Sprintf("CREATE SCHEMA %s", *params.Name)
		if params.Owner != nil {
			query += fmt.Sprintf(" AUTHORIZATION %s", *params.Owner)
		}

		queries = append(queries, query)

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS '%s'", *params.Name, *params.Comment))
		}
	}

	if action == contract.EditSchemaAction {
		params, err := convertToDTO[dto.PostgresSchemaParams](params)
		params = compareAndSetNil(params, oldFields)

		if err != nil {
			return nil, err
		}

		if params.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s RENAME TO %s", findField(oldFields, "nspname"), *params.Name))
		}

		if params.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", findField(oldFields, "nspname"), *params.Owner))
		}

		if params.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS %s", findField(oldFields, "nspname"), *params.Comment))
		}
	}

	if action == contract.DropSchemaAction {
		query := fmt.Sprintf("DROP SCHEMA %s", node.Schema)
		queries = append(queries, query)
	}

	return queries, nil
}
