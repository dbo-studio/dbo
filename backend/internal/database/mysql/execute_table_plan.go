package databaseMysql

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	ddlMysql "github.com/dbo-studio/dbo/internal/database/ddl/mysql"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// BuildTablePlan is the single planning entrypoint shared by PreviewExecute
// and Execute for create-table / edit-table actions.
func (r *MySQLRepository) BuildTablePlan(_ context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (ddl.Plan, string, error) {
	node := r.base.ExtractNode(nodeID)

	general, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableParams](params)
	if err != nil {
		return nil, "", err
	}

	columns, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableColumnParams](params)
	if err != nil {
		return nil, "", err
	}

	keys, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableKeyParams](params)
	if err != nil {
		return nil, "", err
	}

	indexes, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableIndexParams](params)
	if err != nil {
		return nil, "", err
	}

	foreignKeys, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.MysqlTableForeignKeyParams](params)
	if err != nil {
		return nil, "", err
	}

	input := ddlMysql.TableInput{
		Database:    node.Database,
		NodeTable:   node.Table,
		Action:      action,
		General:     general[contract.GeneralTab],
		Columns:     columns[contract.TableColumnsTab],
		Keys:        keys[contract.TableKeysTab],
		Indexes:     indexes[contract.TableIndexesTab],
		ForeignKeys: foreignKeys[contract.TableForeignKeysTab],
	}

	return ddlMysql.BuildTablePlan(input)
}
