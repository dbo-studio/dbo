package databasePostgres

import (
	"context"
	"fmt"

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

// ExecuteAtomic runs every step in a single transaction on the steps' shared
// database. All queries are planned up front, as PreviewExecute does.
func (r *PostgresRepository) ExecuteAtomic(ctx context.Context, steps []contract.ExecuteStep) error {
	if len(steps) == 0 {
		return nil
	}

	database := r.base.ExtractNode(steps[0].NodeID).Database

	var queries []string

	for _, step := range steps {
		if r.base.ExtractNode(step.NodeID).Database != database {
			return fmt.Errorf("atomic execute needs every step on one database")
		}

		stepQueries, err := r.buildExecuteQueries(ctx, step.NodeID, step.Action, step.Params)
		if err != nil {
			return err
		}

		queries = append(queries, stepQueries...)
	}

	conn, err := r.db(ctx, &database)
	if err != nil {
		return err
	}

	return conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			if query == "" {
				continue
			}

			if err := tx.Exec(query).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
