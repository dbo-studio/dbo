package databasePostgres

import (
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) Execute(nodeID string, action contract.TreeNodeActionName, params []byte) error {
	node := extractNode(nodeID)
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := convertToDTO[ExecuteParams](params)
	if err != nil {
		return err
	}

	queries := []string{}

	for tabId := range executeParams {
		dbQueries, err := r.handleDatabaseCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		viewQueries, err := r.handleViewCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		materializedViewQueries, err := r.handleMaterializedViewCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		schemaQueries, err := r.handleSchemaCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		tableQueries, t, err := r.handleTableCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		if node.Table == "" {
			node.Table = t
		}

		tableColumnQueries, err := r.handleTableColumnCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		tableForeignKeyQueries, err := r.handleForeignKeyCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		queries = append(queries, dbQueries...)
		queries = append(queries, viewQueries...)
		queries = append(queries, materializedViewQueries...)
		queries = append(queries, schemaQueries...)
		queries = append(queries, tableQueries...)
		queries = append(queries, tableColumnQueries...)
		queries = append(queries, tableForeignKeyQueries...)
	}

	for _, query := range queries {
		if query == "" {
			continue
		}

		query, err = url.PathUnescape(query)
		if err != nil {
			return err
		}

		if err := r.db.Exec(query).Error; err != nil {
			return err
		}
	}

	return nil
}
