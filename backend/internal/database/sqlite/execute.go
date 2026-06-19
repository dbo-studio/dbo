package databaseSqlite

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) buildExecuteQueries(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return nil, "", err
	}

	queries := []string{}
	var tmpTableName string

	for tabId := range executeParams {
		viewQueries, err := r.handleViewCommands(nodeID, tabId, action, params)
		if err != nil {
			return nil, "", err
		}

		tableQueries, tmpName, err := r.handleTableCommands(ctx, nodeID, executeParams, action, params)
		if err != nil {
			return nil, "", err
		}

		if tmpName != "" {
			tmpTableName = tmpName
		}

		queries = append(queries, viewQueries...)
		queries = append(queries, tableQueries...)
	}

	return queries, tmpTableName, nil
}

func (r *SQLiteRepository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries, _, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	return queries, err
}

func (r *SQLiteRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) error {
	queries, tmpTableName, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	if err != nil {
		return err
	}

	// Execute queries with cleanup on error
	for i, query := range queries {
		if query == "" {
			continue
		}

		query, err = url.PathUnescape(query)
		if err != nil {
			// Cleanup tmp table if it exists
			if tmpTableName != "" {
				r.cleanupTmpTable(ctx, tmpTableName)
			}
			return err
		}

		if err := r.base.DB().WithContext(ctx).Exec(query).Error; err != nil {
			// Cleanup tmp table if it exists
			if tmpTableName != "" {
				r.cleanupTmpTable(ctx, tmpTableName)
			}
			return err
		}

		// After successful DROP of old table and RENAME, tmp table no longer exists
		// So we can clear tmpTableName to avoid unnecessary cleanup
		if tmpTableName != "" && i < len(queries)-1 {
			// Check if this query is the RENAME query
			if strings.Contains(strings.ToUpper(query), "ALTER TABLE") && strings.Contains(strings.ToUpper(query), "RENAME TO") {
				tmpTableName = "" // Tmp table has been renamed, no cleanup needed
			}
		}
	}

	return nil
}

// cleanupTmpTable drops the temporary table if it exists (for error recovery)
func (r *SQLiteRepository) cleanupTmpTable(ctx context.Context, tmpTableName string) {
	if tmpTableName == "" {
		return
	}

	// Use IF EXISTS to avoid errors if table doesn't exist
	cleanupQuery := fmt.Sprintf("DROP TABLE IF EXISTS %s", quoteIdent(tmpTableName))
	_ = r.base.DB().WithContext(ctx).Exec(cleanupQuery).Error
	// Ignore error - this is cleanup, we don't want to mask the original error
}
