package databasePostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	ddlPostgres "github.com/dbo-studio/dbo/internal/database/ddl/postgres"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) handleSequenceCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, data []byte) ([]string, error) {
	switch action {
	case contract.DropSequenceAction:
		if node.Table == "" {
			return nil, nil
		}

		return []string{ddlPostgres.DropSequenceStatement(node.Schema, node.Table).SQL}, nil
	case contract.CreateSequenceAction, contract.EditSequenceAction:
	default:
		return nil, nil
	}

	params, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresSequenceParams](data)
	if err != nil {
		return nil, err
	}

	sequence := params[tabID]
	if sequence == nil {
		return nil, nil
	}

	input := ddlPostgres.SequenceInput{Schema: node.Schema, Old: sequence.Old, New: sequence.New}

	statements, err := ddlPostgres.BuildSequenceStatements(input, action)
	if err != nil {
		return nil, err
	}

	return ddl.Plan(statements).SQLs(), nil
}
