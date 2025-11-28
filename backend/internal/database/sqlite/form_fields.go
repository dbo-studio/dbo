package databaseSqlite

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
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
