package databaseSqlite

import (
	"net/url"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) Execute(nodeID string, action contract.TreeNodeActionName, params []byte) error {
	type ExecuteParams map[contract.TreeTab]any
	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return err
	}

	var queries []string

	tableQueries, err := r.handleTableCommands(nodeID, executeParams, action, params)
	if err != nil {
		return err
	}

	queries = append(queries, tableQueries...)

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
