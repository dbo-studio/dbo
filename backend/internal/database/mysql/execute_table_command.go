package databaseMysql

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) handleTableCommands(node MySQLNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	queries := []string{}
	var tableName string

	if tabId != contract.TableTab && action != contract.DropTableAction {
		return queries, "", nil
	}

	if action == contract.CreateTableAction {
		dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dto[tabId]

		tableName = *params.New.Name
		query := fmt.Sprintf("CREATE TABLE `%s`.`%s` (", node.Database, *params.New.Name)
		query += ")"

		if params.New.Comment != nil {
			query += fmt.Sprintf(" COMMENT='%s'", *params.New.Comment)
		}

		queries = append(queries, query)

		if params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE `%s`.`%s` COMMENT = '%s'", node.Database, *params.New.Name, *params.New.Comment))
		}
	}

	if action == contract.EditTableAction {
		dtoParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
		if err != nil {
			return nil, tableName, err
		}

		params := dtoParams[tabId]
		tableName = *params.Old.Name

		if params.Old.Name != nil && params.New.Name != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE `%s`.`%s` RENAME TO `%s`", node.Database, *params.Old.Name, *params.New.Name))
			params.Old.Name = params.New.Name
		}

		if params.Old.Name != nil && params.New.Comment != nil {
			queries = append(queries, fmt.Sprintf("ALTER TABLE `%s`.`%s` COMMENT = '%s'", node.Database, *params.Old.Name, *params.New.Comment))
		}
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE `%s`.`%s`", node.Database, node.Table)
		queries = append(queries, query)
	}

	return queries, tableName, nil
}
