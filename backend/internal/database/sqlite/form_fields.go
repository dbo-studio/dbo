package databaseSqlite

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) GetFormTabs(action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormTab{
			{ID: contract.TableTab, Name: "Table"},
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableKeysTab, Name: "Keys"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.TableIndexesTab, Name: "Indexes"},
			{ID: contract.TableChecksTab, Name: "Checks"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.ViewTab, Name: "View"},
		}
	default:
		return []contract.FormTab{}
	}
}

func (r *SQLiteRepository) GetFormFields(nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) []contract.FormField {

	switch tabID {
	case contract.TableTab:
		return r.tableFields(action)
	case contract.TableColumnsTab:
		return helper.BuildFieldArray(r.tableColumnFields())
	case contract.TableKeysTab:
		return helper.BuildFieldArray(r.getKeyOptions(nodeID))
	case contract.TableForeignKeysTab:
		return helper.BuildFieldArray(r.foreignKeyOptions(nodeID))
	case contract.TableIndexesTab:
		return helper.BuildFieldArray(r.indexOptions(nodeID))
	case contract.TableChecksTab:
		return helper.BuildFieldArray(r.checkOptions())

	case contract.ViewTab:
		return r.viewFields()
	}

	return []contract.FormField{}
}
