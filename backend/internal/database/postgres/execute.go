package databasePostgres

import (
	"context"
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) buildExecuteQueries(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	node := r.base.ExtractNode(nodeID)
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return nil, err
	}

	queries := []string{}

	for tabId := range executeParams {
		dbQueries, err := r.handleDatabaseCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		viewQueries, err := r.handleViewCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		materializedViewQueries, err := r.handleMaterializedViewCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		schemaQueries, err := r.handleSchemaCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		tableQueries, t, err := r.handleTableCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		if t != "" {
			node.Table = t
		}

		tableColumnQueries, err := r.handleTableColumnCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		tableForeignKeyQueries, err := r.handleForeignKeyCommands(node, tabId, action, params)
		if err != nil {
			return nil, err
		}

		queries = append(queries, dbQueries...)
		queries = append(queries, viewQueries...)
		queries = append(queries, materializedViewQueries...)
		queries = append(queries, schemaQueries...)
		queries = append(queries, tableQueries...)
		queries = append(queries, tableColumnQueries...)
		queries = append(queries, tableForeignKeyQueries...)
	}

	return queries, nil
}

func (r *PostgresRepository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	return r.buildExecuteQueries(ctx, nodeID, action, params)
}

func (r *PostgresRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) error {
	queries, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	if err != nil {
		return err
	}

	for _, query := range queries {
		if query == "" {
			continue
		}

		query, err = url.PathUnescape(query)
		if err != nil {
			return err
		}

		if err := r.base.DB().WithContext(ctx).Exec(query).Error; err != nil {
			return err
		}
	}

	return nil
}
