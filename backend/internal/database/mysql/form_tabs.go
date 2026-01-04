package databaseMysql

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *MySQLRepository) GetFormTabs(_ context.Context, action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		return []contract.FormTab{
			{ID: contract.DatabaseTab, Name: "Database"},
		}
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormTab{
			{ID: contract.TableTab, Name: "Table"},
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.TableKeysTab, Name: "Keys"},
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
