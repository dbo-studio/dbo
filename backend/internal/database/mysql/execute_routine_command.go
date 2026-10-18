package databaseMysql

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	ddlMysql "github.com/dbo-studio/dbo/internal/database/ddl/mysql"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *MySQLRepository) handleRoutineCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	var procedure bool

	switch action {
	case contract.CreateFunctionAction, contract.EditFunctionAction, contract.DropFunctionAction:
		procedure = false
	case contract.CreateProcedureAction, contract.EditProcedureAction, contract.DropProcedureAction:
		procedure = true
	default:
		return nil, nil
	}

	if action == contract.DropFunctionAction || action == contract.DropProcedureAction {
		if tabID != contract.GeneralTab || node.Table == "" {
			return nil, nil
		}

		return ddl.Plan{ddlMysql.BuildRoutineDrop(node.Database, node.Table, procedure)}.SQLs(), nil
	}

	params, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.RoutineParams](data)
	if err != nil {
		return nil, err
	}

	routine := params[tabID]
	if routine == nil || routine.New == nil {
		return nil, nil
	}

	input := ddlMysql.RoutineInput{Database: node.Database, Procedure: procedure, Old: routine.Old, New: routine.New}

	if action == contract.CreateFunctionAction || action == contract.CreateProcedureAction {
		return ddl.Plan(ddlMysql.BuildRoutineCreate(input)).SQLs(), nil
	}

	return ddl.Plan(ddlMysql.BuildRoutineEdit(input)).SQLs(), nil
}
