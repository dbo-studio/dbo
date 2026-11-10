package databaseMysql

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *MySQLRepository) GetFormTabs(ctx context.Context, action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		return []contract.FormTab{
			{ID: contract.DatabaseTab, Name: "Database"},
		}
	case contract.CreateTableAction, contract.EditTableAction:
		tabs := []contract.FormTab{
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.TableKeysTab, Name: "Keys"},
			{ID: contract.TableIndexesTab, Name: "Indexes"},
			{ID: contract.TableTriggersTab, Name: "Triggers"},
		}

		// Servers that ignore CHECK constraints get no Checks tab.
		if supported, _ := r.checksSupport(ctx); supported {
			tabs = append(tabs, contract.FormTab{ID: contract.TableChecksTab, Name: "Checks"})
		}

		return tabs
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.ViewTab, Name: "View"},
		}
	case contract.CreateEventAction, contract.EditEventAction:
		return []contract.FormTab{
			{ID: contract.EventTab, Name: "Event"},
		}
	case contract.CreateFunctionAction, contract.EditFunctionAction:
		return []contract.FormTab{
			{ID: contract.FunctionTab, Name: "Function"},
		}
	case contract.CreateProcedureAction, contract.EditProcedureAction:
		return []contract.FormTab{
			{ID: contract.ProcedureTab, Name: "Procedure"},
		}
	default:
		return []contract.FormTab{}
	}
}
