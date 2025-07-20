package databaseSqlite

import (
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

type SQLiteIndexParams struct {
	Name      string   `json:"name"`
	TableName string   `json:"tableName"`
	Columns   []string `json:"columns"`
	Unique    bool     `json:"unique"`
	Comment   string   `json:"comment"`
}

func (r *SQLiteRepository) handleIndexCommands(node SQLiteNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}

	if tabId != contract.TableIndexesTab {
		return queries, nil
	}

	if action == contract.CreateIndexAction {
		dto, err := helper.ConvertToDTO[map[contract.TreeTab]*SQLiteIndexParams](params)
		if err != nil {
			return nil, err
		}

		paramsData := dto[tabId]
		if paramsData == nil {
			return queries, nil
		}

		query := r.generateCreateIndexQuery(paramsData)
		queries = append(queries, query)
	}

	if action == contract.DropIndexAction {
		// For dropping index, we need the index name
		// This would typically come from the nodeID or params
		indexName := node.Table // Assuming node.Table contains index name for this action
		query := fmt.Sprintf("DROP INDEX %s", indexName)
		queries = append(queries, query)
	}

	return queries, nil
}

func (r *SQLiteRepository) generateCreateIndexQuery(params *SQLiteIndexParams) string {
	query := "CREATE"
	
	if params.Unique {
		query += " UNIQUE"
	}
	
	query += " INDEX"
	
	if params.Name != "" {
		query += fmt.Sprintf(" %s", params.Name)
	}
	
	query += fmt.Sprintf(" ON %s", params.TableName)
	
	if len(params.Columns) > 0 {
		query += fmt.Sprintf(" (%s)", strings.Join(params.Columns, ", "))
	}
	
	return query
}

// Get existing indexes for a table
func (r *SQLiteRepository) getTableIndexes(tableName string) ([]string, error) {
	var indexes []string
	err := r.db.Raw(`
		SELECT name 
		FROM sqlite_master 
		WHERE type = 'index' 
		AND tbl_name = ? 
		AND name NOT LIKE 'sqlite_%'
	`, tableName).Scan(&indexes).Error

	return indexes, err
}

// Drop all indexes for a table (used during table recreation)
func (r *SQLiteRepository) dropTableIndexes(tableName string) []string {
	queries := []string{}
	
	indexes, err := r.getTableIndexes(tableName)
	if err != nil {
		return queries
	}
	
	for _, index := range indexes {
		queries = append(queries, fmt.Sprintf("DROP INDEX %s", index))
	}
	
	return queries
} 