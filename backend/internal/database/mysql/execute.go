package databaseMysql

import (
	"context"
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) buildExecuteQueries(_ context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	node := resolveCreateTableNode(r.base.ExtractNode(nodeID), action, params)
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return nil, err
	}

	queries := []string{}

	for tabID := range executeParams {
		dbQueries, err := r.handleDatabaseCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		viewQueries, err := r.handleViewCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		tableQueries, t, err := r.handleTableCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		if t != "" {
			node.Table = t
		}

		tableColumnQueries, err := r.handleTableColumnCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		tableForeignKeyQueries, err := r.handleForeignKeyCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		tableKeyQueries, err := r.handleTableKeyCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		tableIndexQueries, err := r.handleTableIndexCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		queries = append(queries, dbQueries...)
		queries = append(queries, viewQueries...)
		queries = append(queries, tableQueries...)
		queries = append(queries, tableColumnQueries...)
		queries = append(queries, tableForeignKeyQueries...)
		queries = append(queries, tableKeyQueries...)
		queries = append(queries, tableIndexQueries...)
	}

	return queries, nil
}

func (r *MySQLRepository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	return r.buildExecuteQueries(ctx, nodeID, action, params)
}

func (r *MySQLRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) error {
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
