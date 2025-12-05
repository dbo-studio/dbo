package databaseSqlite

import (
	"context"
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) error {
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return err
	}

	queries := []string{}

	for tabId := range executeParams {
		viewQueries, err := r.handleViewCommands(nodeID, tabId, action, params)
		if err != nil {
			return err
		}

		tableQueries, err := r.handleTableCommands(nodeID, executeParams, action, params)
		if err != nil {
			return err
		}

		queries = append(queries, viewQueries...)
		queries = append(queries, tableQueries...)
	}

	for _, query := range queries {
		if query == "" {
			continue
		}

		query, err = url.PathUnescape(query)
		if err != nil {
			return err
		}

		if err := r.db.WithContext(ctx).Exec(query).Error; err != nil {
			return err
		}
	}

	return nil
}
