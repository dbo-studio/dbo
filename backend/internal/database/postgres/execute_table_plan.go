package databasePostgres

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	ddlPostgres "github.com/dbo-studio/dbo/internal/database/ddl/postgres"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// BuildTablePlan is the single planning entrypoint shared by PreviewExecute
// and Execute for create-table / edit-table actions.
func (r *PostgresRepository) BuildTablePlan(_ context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (ddl.Plan, string, error) {
	node := r.base.ExtractNode(nodeID)

	general, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableParams](params)
	if err != nil {
		return nil, "", err
	}

	columns, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableColumnParams](params)
	if err != nil {
		return nil, "", err
	}

	keys, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableKeyParams](params)
	if err != nil {
		return nil, "", err
	}

	foreignKeys, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.PostgresTableForeignKeyParams](params)
	if err != nil {
		return nil, "", err
	}

	input := ddlPostgres.TableInput{
		Schema:      node.Schema,
		NodeTable:   node.Table,
		Action:      action,
		General:     general[contract.GeneralTab],
		Columns:     columns[contract.TableColumnsTab],
		Keys:        keys[contract.TableKeysTab],
		ForeignKeys: foreignKeys[contract.TableForeignKeysTab],
	}

	return ddlPostgres.BuildTablePlan(input)
}
