package databasePostgres

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) handleMaterializedViewCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateMaterializedViewAction && action != contract.EditMaterializedViewAction && action != contract.DropMaterializedViewAction {
		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresMaterializedViewParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabId]

	if params.New != nil && params.New.Query != nil {
		params.New.Query = formatQuery(params.New.Query)
	}

	if params.Old != nil && params.Old.Query != nil {
		params.Old.Query = formatQuery(params.Old.Query)
	}

	if action == contract.CreateMaterializedViewAction {
		query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s", *params.New.Name)

		if params.New.Tablespace != nil {
			query += fmt.Sprintf(" TABLESPACE %s", *params.New.Tablespace)
		}

		if params.New.Query != nil {
			query += fmt.Sprintf(` AS %s`, *params.New.Query)
		}

		queries = append(queries, query)

		if params.New.Owner != nil {
			queries = append(queries, fmt.Sprintf(`ALTER MATERIALIZED VIEW %s OWNER TO %s`, *params.New.Name, *params.New.Owner))
		}

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON MATERIALIZED VIEW %s IS '%s'", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.DropViewAction {
		query := fmt.Sprintf(`DROP MATERIALIZED VIEW "%s"."%s"`, node.Schema, node.Table)
		queries = append(queries, query)
	}

	return queries, nil
}
