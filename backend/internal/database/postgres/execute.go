package databasePostgres

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

func (r *PostgresRepository) buildExecuteQueries(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	node := r.base.ExtractNode(nodeID)

	type ExecuteParams map[contract.TreeTab]any

	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return nil, err
	}

	// Table create/edit flows are planned through the shared DDL planner so
	// preview and execute always emit the identical statement list.
	if action == contract.CreateTableAction || action == contract.EditTableAction {
		plan, _, err := r.BuildTablePlan(ctx, nodeID, action, params)
		if err != nil {
			return nil, err
		}

		return plan.SQLs(), nil
	}

	queries := []string{}

	for _, tabID := range databaseCore.SortedExecuteTabs(executeParams) {
		dbQueries, err := r.handleDatabaseCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		viewQueries, err := r.handleViewCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		materializedViewQueries, err := r.handleMaterializedViewCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		schemaQueries, err := r.handleSchemaCommands(node, tabID, action, params)
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

		queries = append(queries, dbQueries...)
		queries = append(queries, viewQueries...)
		queries = append(queries, materializedViewQueries...)
		queries = append(queries, schemaQueries...)
		queries = append(queries, tableQueries...)
	}

	return queries, nil
}

func (r *PostgresRepository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	return r.buildExecuteQueries(ctx, nodeID, action, params)
}

func (r *PostgresRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (*contract.ExecuteResult, error) {
	node := r.base.ExtractNode(nodeID)

	queries, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	if err != nil {
		return nil, err
	}

	if action == contract.DropDatabaseAction && node.Database != "" {
		if err := r.base.CloseDatabase(ctx, node.Database); err != nil {
			return nil, err
		}
	}

	conn, err := r.executeConn(ctx, node, action)
	if err != nil {
		return nil, err
	}

	for _, query := range queries {
		if query == "" {
			continue
		}

		if err := conn.WithContext(ctx).Exec(query).Error; err != nil {
			return nil, err
		}
	}

	return databaseCore.ResolveExecuteIdentity(r.base.Connection().ConnectionType, nodeID, action, params), nil
}

func (r *PostgresRepository) executeConn(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) (*gorm.DB, error) {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction, contract.DropDatabaseAction:
		return r.base.DB(), nil
	default:
		return r.db(ctx, &node.Database)
	}
}
