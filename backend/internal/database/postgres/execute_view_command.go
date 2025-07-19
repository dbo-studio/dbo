package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleViewCommands(node PGNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateViewAction && action != contract.EditViewAction && action != contract.DropViewAction {
		return queries, nil
	}

	dto, err := convertToDTO[map[contract.TreeTab]*dto.PostgresViewParams](data)
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

	if action == contract.CreateViewAction {
		query := ""
		if params.New.Name != nil && params.New.Query != nil {
			query = fmt.Sprintf("CREATE VIEW %s AS %s", *params.New.Name, *params.New.Query)
		}

		if params.New.CheckOption != nil {
			query += fmt.Sprintf(" WITH %s CHECK OPTION", *params.New.CheckOption)
		}

		queries = append(queries, query)

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("COMMENT ON VIEW %s IS '%s'", *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.DropViewAction {
		query := fmt.Sprintf(`DROP VIEW "%s"."%s"`, node.Schema, node.Table)
		queries = append(queries, query)
	}

	return queries, nil
}

func formatQuery(query *string) *string {
	formattedQuery := lo.FromPtr(query)
	formattedQuery = strings.ReplaceAll(formattedQuery, ";", "")
	return &formattedQuery
}
