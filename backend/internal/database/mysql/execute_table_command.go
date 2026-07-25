package databaseMysql

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) handleTableCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	queries := []string{}
	var tableName string

	if tabID != contract.GeneralTab && action != contract.DropTableAction {
		return queries, "", nil
	}

	if action == contract.CreateTableAction {
		query, name, err := buildMysqlCreateTableQuery(node, params)
		if err != nil {
			return nil, tableName, err
		}

		tableName = name
		queries = append(queries, query)
	}

	if action == contract.EditTableAction {
		dtoParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dtoParams[tabID]
		if params == nil || params.Old == nil || params.Old.Name == nil {
			return queries, tableName, nil
		}

		tableName = *params.Old.Name

		if params.New != nil && params.New.Name != nil && *params.Old.Name != *params.New.Name {
			queries = append(queries, fmt.Sprintf("ALTER TABLE `%s`.`%s` RENAME TO `%s`", node.Database, *params.Old.Name, *params.New.Name))
			tableName = *params.New.Name
		}

		if params.New != nil && params.New.Comment != nil && *params.New.Comment != "" {
			queries = append(queries, fmt.Sprintf("ALTER TABLE `%s`.`%s` COMMENT = '%s'", node.Database, tableName, *params.New.Comment))
		}
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE `%s`.`%s`", node.Database, node.Table)
		queries = append(queries, query)
	}

	return queries, tableName, nil
}
