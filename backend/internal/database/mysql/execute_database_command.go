package databaseMysql

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) handleDatabaseCommands(node MySQLNode, tabId contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateDatabaseAction && action != contract.EditDatabaseAction && action != contract.DropDatabaseAction {
		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresDatabaseParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabId]

	if action == contract.CreateDatabaseAction {
		query := fmt.Sprintf("CREATE DATABASE `%s`", *params.New.Name)
		if params.New.Comment != nil {
			query += fmt.Sprintf(" COMMENT '%s'", *params.New.Comment)
		}
		queries = append(queries, query)
	}

	if action == contract.EditDatabaseAction {
		if params.Old.Name != nil && params.New.Name != nil {
			query := fmt.Sprintf("ALTER DATABASE `%s` RENAME TO `%s`", *params.Old.Name, *params.New.Name)
			queries = append(queries, query)
			params.Old.Name = params.New.Name
		}

		if params.Old.Name != nil && params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("ALTER DATABASE `%s` COMMENT '%s'", *params.Old.Name, *params.New.Comment))
		}
	}

	if action == contract.DropDatabaseAction {
		query := fmt.Sprintf("DROP DATABASE `%s`", node.Database)
		queries = append(queries, query)
	}

	return queries, nil
}

