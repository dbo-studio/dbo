package databaseMysql

import (
	"encoding/json"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) resolveMysqlTableNode(node contract.DBNode, action contract.TreeNodeActionName) contract.DBNode {
	if node.Database != "" && node.Table != "" {
		return node
	}

	switch action {
	case contract.EditTableAction, contract.DropTableAction:
		if node.Table == "" && node.Database != "" {
			return contract.DBNode{
				Database: r.connectionDatabase(),
				Table:    node.Database,
			}
		}
	case contract.EditViewAction, contract.DropViewAction:
		if node.Table != "" && node.Database == "" {
			return contract.DBNode{
				Database: r.connectionDatabase(),
				Table:    node.Table,
			}
		}
		if node.Table == "" && node.Database != "" {
			return contract.DBNode{
				Database: r.connectionDatabase(),
				Table:    node.Database,
			}
		}
	}

	return node
}

func (r *MySQLRepository) connectionDatabase() string {
	if r.base == nil || r.base.Connection() == nil {
		return "default"
	}

	options, err := helper.RawJSONToStruct[dto.MysqlCreateConnectionParams](json.RawMessage(r.base.Connection().Options))
	if err != nil || options.Database == nil || *options.Database == "" {
		return "default"
	}

	return *options.Database
}
