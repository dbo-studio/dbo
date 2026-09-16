package databaseMysql

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// resolveCreateTableNode sets the table name for a create-table action
// started on the table container node, where node.Table is not yet a name.
func resolveCreateTableNode(node contract.DBNode, action contract.TreeNodeActionName, data []byte) contract.DBNode {
	if action != contract.CreateTableAction || node.Table != string(contract.TableContainerNodeType) {
		return node
	}

	tableParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableParams](data)
	if err != nil {
		return node
	}

	params := tableParams[contract.GeneralTab]
	if params == nil || params.New == nil || params.New.Name == nil {
		return node
	}

	node.Table = *params.New.Name

	return node
}
