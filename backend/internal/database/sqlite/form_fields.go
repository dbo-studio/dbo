package databaseSqlite

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) GetFormTabs(_ context.Context, action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormTab{
			{ID: contract.TableTab, Name: "Table"},
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableKeysTab, Name: "Keys"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.TableIndexesTab, Name: "Indexes"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.ViewTab, Name: "View"},
		}
	default:
		return []contract.FormTab{}
	}
}

func (r *SQLiteRepository) GetFormFields(_ context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) []contract.FormField {

	switch tabID {
	case contract.TableTab:
		return r.tableFields()
	case contract.TableColumnsTab:
		return helper.BuildFieldArray(r.tableColumnFields())
	case contract.TableKeysTab:
		return helper.BuildFieldArray(r.keyOptions(nodeID))
	case contract.TableForeignKeysTab:
		return helper.BuildFieldArray(r.foreignKeyOptions(nodeID))
	case contract.TableIndexesTab:
		return helper.BuildFieldArray(r.indexOptions(nodeID))

	case contract.ViewTab:
		return r.viewFields()
	}

	return []contract.FormField{}
}
