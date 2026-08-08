package databaseMysql

import (
	"context"
	"fmt"
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
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

	for _, tabID := range databaseCore.SortedExecuteTabs(executeParams) {
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

func (r *MySQLRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (*contract.ExecuteResult, error) {
	queries, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	if err != nil {
		return nil, err
	}

	node := r.base.ExtractNode(nodeID)
	if action == contract.DropDatabaseAction && node.Database != "" {
		if err := r.base.CloseDatabase(ctx, node.Database); err != nil {
			return nil, err
		}
	}

	if err := r.execQueries(ctx, node, action, queries); err != nil {
		return nil, err
	}

	return databaseCore.ResolveExecuteIdentity(r.base.Connection().ConnectionType, nodeID, action, params), nil
}

func (r *MySQLRepository) execQueries(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName, queries []string) error {
	if !shouldUseMysqlDatabase(action, node.Database) {
		return runQueries(queries, func(query string) error {
			return r.base.DB().WithContext(ctx).Exec(query).Error
		})
	}

	sqlDB, err := r.base.DB().DB()
	if err != nil {
		return err
	}

	conn, err := sqlDB.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, fmt.Sprintf("USE `%s`", node.Database)); err != nil {
		return err
	}

	return runQueries(queries, func(query string) error {
		_, err := conn.ExecContext(ctx, query)
		return err
	})
}

func runQueries(queries []string, exec func(string) error) error {
	for _, query := range queries {
		if query == "" {
			continue
		}

		query, err := url.PathUnescape(query)
		if err != nil {
			return err
		}

		if err := exec(query); err != nil {
			return err
		}
	}

	return nil
}

func shouldUseMysqlDatabase(action contract.TreeNodeActionName, database string) bool {
	if database == "" {
		return false
	}

	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction, contract.DropDatabaseAction:
		return false
	default:
		return true
	}
}
