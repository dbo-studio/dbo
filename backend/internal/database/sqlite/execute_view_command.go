package databaseSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) handleViewCommands(node SQLiteNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateViewAction && action != contract.EditViewAction && action != contract.DropViewAction {
		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteCreateObjectParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabId]
	if params == nil {
		return queries, nil
	}

	if params.Query != "" {
		params.Query = formatSQLiteQuery(params.Query)
	}

	if action == contract.CreateViewAction {
		query := ""
		if params.Name != "" && params.Query != "" {
			if params.OrReplace {
				query = fmt.Sprintf("CREATE OR REPLACE VIEW %s AS %s", params.Name, params.Query)
			} else {
				query = fmt.Sprintf("CREATE VIEW %s AS %s", params.Name, params.Query)
			}
		}

		queries = append(queries, query)
	}

	if action == contract.EditViewAction {
		// For SQLite, we need to drop and recreate the view
		// This will be handled by transaction in execute.go
		// First drop the existing view
		dropQuery := fmt.Sprintf("DROP VIEW %s", node.Table)
		queries = append(queries, dropQuery)

		// Then create the new view
		if params.Name != "" && params.Query != "" {
			createQuery := fmt.Sprintf("CREATE VIEW %s AS %s", params.Name, params.Query)
			queries = append(queries, createQuery)
		}
	}

	if action == contract.DropViewAction {
		query := fmt.Sprintf("DROP VIEW %s", node.Table)
		queries = append(queries, query)
	}

	return queries, nil
}

func formatSQLiteQuery(query string) string {
	formattedQuery := query
	formattedQuery = strings.ReplaceAll(formattedQuery, ";", "")
	return formattedQuery
} 