package databasePostgres

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	ddlPostgres "github.com/dbo-studio/dbo/internal/database/ddl/postgres"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *PostgresRepository) handleRoutineCommands(ctx context.Context, node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	var (
		procedure bool
		kind      string
	)

	switch action {
	case contract.CreateFunctionAction, contract.EditFunctionAction, contract.DropFunctionAction:
		procedure, kind = false, "function"
	case contract.CreateProcedureAction, contract.EditProcedureAction, contract.DropProcedureAction:
		procedure, kind = true, "procedure"
	default:
		return nil, nil
	}

	if action == contract.DropFunctionAction || action == contract.DropProcedureAction {
		if tabID != contract.GeneralTab || node.Table == "" {
			return nil, nil
		}

		target, err := r.routineTarget(ctx, node, procedure, nil)
		if err != nil {
			return nil, err
		}

		return ddl.Plan{ddlPostgres.BuildRoutineDrop(node.Schema, target.Name, target.IdentityArgs, procedure)}.SQLs(), nil
	}

	params, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.RoutineParams](data)
	if err != nil {
		return nil, err
	}

	routine := params[tabID]
	if routine == nil || routine.New == nil {
		return nil, nil
	}

	input := ddlPostgres.RoutineInput{Schema: node.Schema, Procedure: procedure, Old: routine.Old, New: routine.New}

	if action == contract.CreateFunctionAction || action == contract.CreateProcedureAction {
		statements, err := ddlPostgres.BuildRoutineCreate(input)
		if err != nil {
			return nil, err
		}

		return ddl.Plan(statements).SQLs(), nil
	}

	if routine.Old == nil || lo.FromPtr(routine.Old.Name) == "" {
		return nil, fmt.Errorf("missing %s name", kind)
	}

	target, err := r.routineTarget(ctx, node, procedure, routine.Old.Parameters)
	if err != nil {
		return nil, err
	}

	input.OldIdentity = target.IdentityArgs

	statements, err := ddlPostgres.BuildRoutineEdit(input)
	if err != nil {
		return nil, err
	}

	return ddl.Plan(statements).SQLs(), nil
}

// routineTarget resolves the routine the node id points at. If the form was opened on a
// different definition than the one now in the database, it fails instead of editing blind.
func (r *PostgresRepository) routineTarget(ctx context.Context, node contract.DBNode, procedure bool, openedParameters *string) (*Routine, error) {
	routines, err := r.routines(ctx, &node.Database, &node.Schema, procedure)
	if err != nil {
		return nil, err
	}

	target, err := findRoutine(routines, node.Table)
	if err != nil {
		return nil, err
	}

	if openedParameters != nil && target.Parameters != *openedParameters {
		return nil, fmt.Errorf("%q changed since the form was opened; reopen it", target.Name)
	}

	return target, nil
}
