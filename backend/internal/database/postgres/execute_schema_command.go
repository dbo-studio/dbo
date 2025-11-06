package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) handleSchemaCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateSchemaAction && action != contract.EditSchemaAction && action != contract.DropSchemaAction {
		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresSchemaParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabId]

	if action == contract.CreateSchemaAction {
		queries = append(queries, fmt.Sprintf("CREATE SCHEMA %s", *params.New.Name))

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", *params.New.Name, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS '%s'", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.EditSchemaAction {
		if params.Old.Name != nil && params.New.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s RENAME TO %s", *params.Old.Name, *params.New.Name))
			params.Old.Name = params.New.Name
		}

		if params.Old.Name != nil && params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf("ALTER SCHEMA %s OWNER TO %s", *params.Old.Name, *params.New.Owner))
		}

		if params.Old.Name != nil && params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON SCHEMA %s IS '%s'", *params.Old.Name, *params.New.Comment))
		}
	}

	if action == contract.DropSchemaAction {
		query := fmt.Sprintf("DROP SCHEMA %s", node.Schema)
		queries = append(queries, query)
	}

	return queries, nil
}
