package databaseSqlite

import (
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

type SQLiteNode struct {
	Table  string
	Schema string
}

func (r *SQLiteRepository) Execute(nodeID string, action contract.TreeNodeActionName, params []byte) error {
	node := extractSQLiteNode(nodeID)
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return err
	}

	queries := []string{}

	for tabId := range executeParams {
		tableQueries, t, err := r.handleTableCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		if node.Table == "" {
			node.Table = t
		}

		viewQueries, err := r.handleViewCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		indexQueries, err := r.handleIndexCommands(node, tabId, action, params)
		if err != nil {
			return err
		}

		queries = append(queries, tableQueries...)
		queries = append(queries, viewQueries...)
		queries = append(queries, indexQueries...)
	}

	// Execute queries within a transaction for complex operations
	if len(queries) > 1 {
		return r.executeWithTransaction(queries)
	}

	// Execute single query without transaction
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

func (r *SQLiteRepository) executeWithTransaction(queries []string) error {
	// Start transaction
	tx := r.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Defer rollback in case of error
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Execute all queries in transaction
	for _, query := range queries {
		if query == "" {
			continue
		}

		unescapedQuery, err := url.PathUnescape(query)
		if err != nil {
			tx.Rollback()
			return err
		}

		if err := tx.Exec(unescapedQuery).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Commit transaction
	return tx.Commit().Error
}

func extractSQLiteNode(nodeID string) SQLiteNode {
	// For SQLite, nodeID is typically just the table/view name
	// since SQLite doesn't have schemas like PostgreSQL
	return SQLiteNode{
		Table:  nodeID,
		Schema: "main", // SQLite default schema
	}
} 