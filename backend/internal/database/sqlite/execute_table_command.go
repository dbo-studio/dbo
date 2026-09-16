package databaseSqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	ddlSqlite "github.com/dbo-studio/dbo/internal/database/ddl/sqlite"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) handleTableCommands(ctx context.Context, node string, tabID map[contract.TreeTab]any, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	if !r.isTableRelatedAction(tabID, action) {
		return []string{}, "", nil
	}

	if action == contract.DropTableAction {
		return []string{fmt.Sprintf("DROP TABLE %s", quoteIdent(node))}, "", nil
	}

	paramsMap, err := r.parseTableParams(params)
	if err != nil {
		return nil, "", err
	}

	paramsMap.tableParams = r.initializeTableParams(paramsMap.tableParams, node)

	// Populate the current schema state before building the planner input —
	// population replaces the params map entries.
	if action == contract.EditTableAction {
		r.populateParamsFromDatabase(ctx, paramsMap, *paramsMap.tableParams.Old.Name)
	}

	input := ddlSqlite.TableInput{
		TableParams:      paramsMap.tableParams,
		ColumnParams:     paramsMap.columnParams,
		ForeignKeyParams: paramsMap.foreignKeyParams,
		KeyParams:        paramsMap.keyParams,
		IndexParams:      paramsMap.indexParams,
	}

	switch action {
	case contract.CreateTableAction:
		return ddlSqlite.BuildCreatePlan(input).SQLs(), "", nil
	case contract.EditTableAction:
		tmpBaseName := *paramsMap.tableParams.Old.Name
		if paramsMap.tableParams.New != nil && paramsMap.tableParams.New.Name != nil && *paramsMap.tableParams.New.Name != "" {
			tmpBaseName = *paramsMap.tableParams.New.Name
		}

		tmpTableName := r.getUniqueTmpTableName(tmpBaseName)

		plan, err := ddlSqlite.BuildEditPlan(input, tmpTableName)
		if err != nil {
			return nil, "", err
		}

		return plan.SQLs(), tmpTableName, nil
	default:
		return []string{}, "", nil
	}
}

type tableParamsMap struct {
	tableParams      *dto.SQLiteTableParams
	columnParams     *dto.SQLiteTableColumnParams
	foreignKeyParams *dto.SQLiteTableForeignKeyParams
	keyParams        *dto.SQLiteTableKeyParams
	indexParams      *dto.SQLiteIndexParams
}

func (r *SQLiteRepository) parseTableParams(params []byte) (*tableParamsMap, error) {
	tableParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableParams](params)
	if err != nil {
		return nil, err
	}

	columnParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableColumnParams](params)
	if err != nil {
		return nil, err
	}

	foreignKeyParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableForeignKeyParams](params)
	if err != nil {
		return nil, err
	}

	keyParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableKeyParams](params)
	if err != nil {
		return nil, err
	}

	indexParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteIndexParams](params)
	if err != nil {
		return nil, err
	}

	return &tableParamsMap{
		tableParams:      tableParamsDto[contract.GeneralTab],
		columnParams:     columnParamsDto[contract.TableColumnsTab],
		foreignKeyParams: foreignKeyParamsDto[contract.TableForeignKeysTab],
		keyParams:        keyParamsDto[contract.TableKeysTab],
		indexParams:      indexParamsDto[contract.TableIndexesTab],
	}, nil
}

func (r *SQLiteRepository) isTableRelatedAction(_ map[contract.TreeTab]any, action contract.TreeNodeActionName) bool {
	switch action {
	case contract.DropTableAction, contract.CreateTableAction, contract.EditTableAction:
		return true
	default:
		return false
	}
}

func (r *SQLiteRepository) initializeTableParams(tableParams *dto.SQLiteTableParams, node string) *dto.SQLiteTableParams {
	if tableParams == nil {
		tableParams = &dto.SQLiteTableParams{}
	}

	if tableParams.Old == nil {
		tableParams.Old = &dto.SQLiteTableParamsData{
			Name: lo.ToPtr(node),
		}
	}

	if tableParams.Old.Name == nil {
		tableParams.Old.Name = lo.ToPtr(node)
	}

	return tableParams
}

func (r *SQLiteRepository) populateParamsFromDatabase(ctx context.Context, paramsMap *tableParamsMap, tableName string) {
	if paramsMap.columnParams == nil {
		paramsMap.columnParams = &dto.SQLiteTableColumnParams{}
	}

	if paramsMap.foreignKeyParams == nil {
		paramsMap.foreignKeyParams = &dto.SQLiteTableForeignKeyParams{}
	}

	if paramsMap.keyParams == nil {
		paramsMap.keyParams = &dto.SQLiteTableKeyParams{}
	}

	tableDDL := r.populateTableParamsFromDDL(ctx, paramsMap.tableParams)
	r.populateColumnParamsFromDDL(ctx, paramsMap.columnParams, tableDDL, tableName)
	r.populateForeignKeyParamsFromDB(ctx, paramsMap.foreignKeyParams, tableName)
	r.populateKeyParamsFromDB(ctx, paramsMap.keyParams, tableName)
}

func (r *SQLiteRepository) getUniqueTmpTableName(baseName string) string {
	baseTmpName := "__tmp_" + baseName

	if !r.tableExists(baseTmpName) {
		return baseTmpName
	}

	for i := 1; i < 1000; i++ {
		candidateName := fmt.Sprintf("%s_%d", baseTmpName, i)
		if !r.tableExists(candidateName) {
			return candidateName
		}
	}

	return fmt.Sprintf("%s_%d", baseTmpName, time.Now().Unix())
}

func (r *SQLiteRepository) tableExists(tableName string) bool {
	var count int64
	r.base.DB().Table("sqlite_master").
		Where("type = 'table' AND name = ?", tableName).
		Count(&count)

	return count > 0
}

func quoteIdent(name string) string {
	return quote.SqliteIdent(name)
}
