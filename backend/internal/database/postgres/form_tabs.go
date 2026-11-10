package databasePostgres

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) GetFormTabs(_ context.Context, action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		return []contract.FormTab{
			{ID: contract.DatabaseTab, Name: "Database"},
		}
	case contract.CreateSchemaAction, contract.EditSchemaAction:
		return []contract.FormTab{
			{ID: contract.SchemaTab, Name: "Schema"},
		}
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormTab{
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.TableKeysTab, Name: "Keys"},
			{ID: contract.TableIndexesTab, Name: "Indexes"},
			{ID: contract.TableChecksTab, Name: "Checks"},
			{ID: contract.TableTriggersTab, Name: "Triggers"},
			{ID: contract.TableSequenceTab, Name: "Sequences"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.ViewTab, Name: "View"},
		}
	case contract.CreateMaterializedViewAction, contract.EditMaterializedViewAction:
		return []contract.FormTab{
			{ID: contract.MaterializedViewTab, Name: "Materialized View"},
		}
	case contract.CreateTypeAction, contract.EditTypeAction:
		return []contract.FormTab{
			{ID: contract.TypeTab, Name: "Type"},
		}
	case contract.CreateFunctionAction, contract.EditFunctionAction:
		return []contract.FormTab{
			{ID: contract.FunctionTab, Name: "Function"},
		}
	case contract.CreateProcedureAction, contract.EditProcedureAction:
		return []contract.FormTab{
			{ID: contract.ProcedureTab, Name: "Procedure"},
		}
	case contract.CreateSequenceAction, contract.EditSequenceAction:
		return []contract.FormTab{
			{ID: contract.SequenceTab, Name: "Sequence"},
		}
	default:
		return []contract.FormTab{}
	}
}
