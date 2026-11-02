package databaseMysql

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	ddlMysql "github.com/dbo-studio/dbo/internal/database/ddl/mysql"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) handleEventCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	switch action {
	case contract.DropEventAction:
		if tabID != contract.GeneralTab || node.Table == "" {
			return nil, nil
		}

		return ddl.Plan{ddlMysql.BuildEventDrop(node.Database, node.Table)}.SQLs(), nil
	case contract.CreateEventAction, contract.EditEventAction:
	default:
		return nil, nil
	}

	params, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.EventParams](data)
	if err != nil {
		return nil, err
	}

	event := params[tabID]
	if event == nil || event.New == nil {
		return nil, nil
	}

	input := ddlMysql.EventInput{Database: node.Database, Old: event.Old, New: event.New}

	build := ddlMysql.BuildEventEdit
	if action == contract.CreateEventAction {
		build = ddlMysql.BuildEventCreate
	}

	statements, err := build(input)
	if err != nil {
		return nil, err
	}

	return ddl.Plan(statements).SQLs(), nil
}
