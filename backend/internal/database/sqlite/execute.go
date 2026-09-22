package databaseSqlite

import (
	"context"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) buildExecuteQueries(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	type ExecuteParams map[contract.TreeTab]any

	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return nil, "", err
	}

	queries := []string{}

	for _, tabID := range databaseCore.SortedExecuteTabs(executeParams) {
		viewQueries, err := r.handleViewCommands(nodeID, tabID, action, params)
		if err != nil {
			return nil, "", err
		}

		queries = append(queries, viewQueries...)
	}

	if action == contract.CreateTableAction || action == contract.EditTableAction {
		plan, tmpTableName, err := r.BuildTablePlan(ctx, nodeID, action, params)
		if err != nil {
			return nil, "", err
		}

		return append(queries, plan.SQLs()...), tmpTableName, nil
	}

	tableQueries, tmpTableName, err := r.handleTableCommands(ctx, nodeID, executeParams, action, params)
	if err != nil {
		return nil, "", err
	}

	queries = append(queries, tableQueries...)

	return queries, tmpTableName, nil
}

func (r *SQLiteRepository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries, _, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	return queries, err
}

func (r *SQLiteRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (*contract.ExecuteResult, error) {
	queries, tmpTableName, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	if err != nil {
		return nil, err
	}

	for i, query := range queries {
		if query == "" {
			continue
		}

		if err := r.base.DB().WithContext(ctx).Exec(query).Error; err != nil {
			if tmpTableName != "" {
				r.cleanupTmpTable(ctx, tmpTableName)
			}

			return nil, err
		}

		if tmpTableName != "" && i < len(queries)-1 {
			if strings.Contains(strings.ToUpper(query), "ALTER TABLE") && strings.Contains(strings.ToUpper(query), "RENAME TO") {
				tmpTableName = ""
			}
		}
	}

	return databaseCore.ResolveExecuteIdentity(r.base.Connection().ConnectionType, nodeID, action, params), nil
}

func (r *SQLiteRepository) cleanupTmpTable(ctx context.Context, tmpTableName string) {
	if tmpTableName == "" {
		return
	}

	cleanupQuery := fmt.Sprintf("DROP TABLE IF EXISTS %s", quote.SqliteIdent(tmpTableName))
	_ = r.base.DB().WithContext(ctx).Exec(cleanupQuery).Error
}
