package databaseMysql

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) handleDatabaseCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	queries := []string{}

	if action != contract.CreateDatabaseAction && action != contract.EditDatabaseAction && action != contract.DropDatabaseAction {
		return queries, nil
	}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresDatabaseParams](data)
	if err != nil {
		return nil, err
	}

	params := dto[tabID]

	if action == contract.CreateDatabaseAction {
		query := fmt.Sprintf("CREATE DATABASE `%s`", *params.New.Name)
		if params.New.Comment != nil {
			query += fmt.Sprintf(" COMMENT '%s'", *params.New.Comment)
		}
		queries = append(queries, query)
	}

	if action == contract.EditDatabaseAction {
		if params == nil || params.Old == nil || params.New == nil || params.Old.Name == nil {
			return queries, nil
		}

		dbName := *params.Old.Name

		if params.New.Name != nil && *params.Old.Name != *params.New.Name {
			queries = append(queries, fmt.Sprintf("ALTER DATABASE `%s` RENAME TO `%s`", dbName, *params.New.Name))
			dbName = *params.New.Name
		}

		if params.New.Comment != nil && (params.Old.Comment == nil || *params.Old.Comment != *params.New.Comment) {
			queries = append(queries, fmt.Sprintf("ALTER DATABASE `%s` COMMENT '%s'", dbName, *params.New.Comment))
		}
	}

	if action == contract.DropDatabaseAction {
		query := fmt.Sprintf("DROP DATABASE `%s`", node.Database)
		queries = append(queries, query)
	}

	return queries, nil
}
