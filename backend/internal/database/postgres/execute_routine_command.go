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

		identity, err := r.routineIdentity(ctx, node, procedure, node.Table, nil)
		if err != nil {
			return nil, err
		}

		return ddl.Plan{ddlPostgres.BuildRoutineDrop(node.Schema, node.Table, identity, procedure)}.SQLs(), nil
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

	input.OldIdentity, err = r.routineIdentity(ctx, node, procedure, *routine.Old.Name, routine.Old.Parameters)
	if err != nil {
		return nil, err
	}

	statements, err := ddlPostgres.BuildRoutineEdit(input)
	if err != nil {
		return nil, err
	}

	return ddl.Plan(statements).SQLs(), nil
}

// routineIdentity finds the identity argument list PostgreSQL needs to drop a
// routine. With overloads, parameters picks the one the form loaded.
func (r *PostgresRepository) routineIdentity(ctx context.Context, node contract.DBNode, procedure bool, name string, parameters *string) (string, error) {
	routines, err := r.routines(ctx, &node.Database, &node.Schema, procedure)
	if err != nil {
		return "", err
	}

	var fallback *Routine

	for i, routine := range routines {
		if routine.Name != name {
			continue
		}

		if parameters != nil && routine.Parameters == *parameters {
			return routine.IdentityArgs, nil
		}

		if fallback == nil {
			fallback = &routines[i]
		}
	}

	if fallback == nil {
		return "", fmt.Errorf("routine %q not found", name)
	}

	return fallback.IdentityArgs, nil
}
