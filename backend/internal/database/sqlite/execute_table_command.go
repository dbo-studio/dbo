package databaseSqlite

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) handleTableCommands(ctx context.Context, node string, tabID map[contract.TreeTab]any, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	if !r.isTableRelatedAction(tabID, action) {
		return []string{}, "", nil
	}

	if action == contract.DropTableAction {
		return []string{fmt.Sprintf("DROP TABLE %s", node)}, "", nil
	}

	paramsMap, err := r.parseTableParams(params)
	if err != nil {
		return nil, "", err
	}

	r.initializeTableParams(paramsMap.tableParams, node)

	if action == contract.EditTableAction {
		r.populateParamsFromDatabase(ctx, paramsMap, *paramsMap.tableParams.Old.Name)
	}

	switch action {
	case contract.CreateTableAction:
		return r.buildCreateTableQueries(paramsMap), "", nil
	case contract.EditTableAction:
		return r.buildEditTableQueries(paramsMap)
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
		tableParams:      tableParamsDto[contract.TableTab],
		columnParams:     columnParamsDto[contract.TableColumnsTab],
		foreignKeyParams: foreignKeyParamsDto[contract.TableForeignKeysTab],
		keyParams:        keyParamsDto[contract.TableKeysTab],
		indexParams:      indexParamsDto[contract.TableIndexesTab],
	}, nil
}

func (r *SQLiteRepository) isTableRelatedAction(tabID map[contract.TreeTab]any, action contract.TreeNodeActionName) bool {
	if action == contract.DropTableAction {
		return true
	}

	var treeTab contract.TreeTab
	for key := range tabID {
		treeTab = key
		break
	}

	return treeTab == contract.TableTab ||
		treeTab == contract.TableColumnsTab ||
		treeTab == contract.TableForeignKeysTab ||
		treeTab == contract.TableKeysTab ||
		treeTab == contract.TableIndexesTab
}

func (r *SQLiteRepository) initializeTableParams(tableParams *dto.SQLiteTableParams, node string) {
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
	r.populateForeignKeyParamsFromDB(paramsMap.foreignKeyParams, tableName)
	r.populateKeyParamsFromDB(ctx, paramsMap.keyParams, tableName)
}

func (r *SQLiteRepository) buildCreateTableQueries(paramsMap *tableParamsMap) []string {
	queries := []string{}
	tableName := lo.FromPtr(paramsMap.tableParams.New.Name)

	columnDefs := r.buildAllColumnDefinitions(paramsMap)
	createQuery := r.buildCreateTableQuery(quoteIdent(tableName), paramsMap.tableParams.New, columnDefs)
	queries = append(queries, createQuery)

	if paramsMap.indexParams != nil && len(paramsMap.indexParams.Indexes) > 0 {
		queries = append(queries, r.buildCreateIndexesQueries(tableName, paramsMap.indexParams.Indexes)...)
	}

	return queries
}

func (r *SQLiteRepository) buildEditTableQueries(paramsMap *tableParamsMap) ([]string, string, error) {
	oldName := *paramsMap.tableParams.Old.Name
	newName := r.getNewTableName(paramsMap.tableParams, oldName)
	tmpTableName := r.getUniqueTmpTableName(newName)

	columnDefs := r.buildAllColumnDefinitions(paramsMap)
	if columnDefs == "" {
		return nil, "", fmt.Errorf("table %s has no column definitions", oldName)
	}

	queries := r.buildTableRecreateQueries(tmpTableName, oldName, newName, paramsMap.tableParams.New, columnDefs, paramsMap)

	if paramsMap.indexParams != nil && len(paramsMap.indexParams.Indexes) > 0 {
		queries = append(queries, r.buildEditIndexesQueries(newName, paramsMap.indexParams.Indexes)...)
	}

	return queries, tmpTableName, nil
}
