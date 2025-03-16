package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) GetFormTabs(action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		return []contract.FormTab{
			{ID: contract.DatabaseTab, Name: "Database"},
			{ID: contract.DatabasePrivilegesTab, Name: "Database Privileges"},
		}
	case contract.CreateSchemaAction, contract.EditSchemaAction:
		return []contract.FormTab{
			{ID: contract.SchemaTab, Name: "Schema"},
			{ID: contract.SchemaPrivilegesTab, Name: "Schema Privileges"},
		}
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormTab{
			{ID: contract.TableTab, Name: "Table"},
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.TableIndexesTab, Name: "Indexes"},
			{ID: contract.TableTriggersTab, Name: "Triggers"},
			{ID: contract.TableChecksTab, Name: "Checks"},
			{ID: contract.TableKeysTab, Name: "Keys"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.ViewTab, Name: "View"},
			{ID: contract.ViewDefinitionTab, Name: "View Definition"},
			{ID: contract.ViewPrivilegesTab, Name: "View Privileges"},
		}
	case contract.CreateMaterializedViewAction, contract.EditMaterializedViewAction:
		return []contract.FormTab{
			{ID: contract.MaterializedViewTab, Name: "Materialized View"},
			{ID: contract.MaterializedViewDefinitionTab, Name: "Materialized Definition"},
			{ID: contract.MaterializedViewStorageTab, Name: "Storage"},
			{ID: contract.MaterializedViewPrivilegesTab, Name: "Materialized Privileges"},
		}
	case contract.CreateIndexAction, contract.EditIndexAction:
		return []contract.FormTab{
			{ID: contract.IndexTab, Name: "Index"},
			{ID: contract.IndexColumnsTab, Name: "Columns"},
			{ID: contract.IndexStorageTab, Name: "Storage"},
		}
	case contract.CreateSequenceAction, contract.EditSequenceAction:
		return []contract.FormTab{
			{ID: contract.SequenceTab, Name: "Sequence"},
			{ID: contract.SequenceDefinitionTab, Name: "SequenceDefinition"},
			{ID: contract.SequencePrivilegesTab, Name: "Sequence Privileges"},
		}
	default:
		return []contract.FormTab{}
	}
}

func (r *PostgresRepository) GetFormFields(nodeID string, action contract.TreeNodeActionName, tabID contract.TreeTab) []contract.FormField {
	node := extractNode(nodeID)

	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		switch tabID {
		case contract.DatabaseTab:
			return r.databaseFields()
		}

	case contract.CreateSchemaAction, contract.EditSchemaAction:
		switch tabID {
		case contract.SchemaTab:
			return r.schemaFields()
		case contract.SchemaPrivilegesTab:
			return r.schemaPrivilegeOptions()
		}

	case contract.CreateTableAction, contract.EditTableAction:
		switch tabID {
		case contract.TableTab:
			return r.tableFields()
		case contract.TableColumnsTab:
			return r.tableColumnFields()
		case contract.TableForeignKeysTab:
			return r.foreignKeyOptions(node)
		case contract.TableIndexesTab:
			return []contract.FormField{
				{ID: "indexes", Name: "Indexes", Type: "array", Fields: r.indexOptions(node)},
			}
		case contract.TableTriggersTab:
			return []contract.FormField{
				{ID: "triggers", Name: "Triggers", Type: "array", Fields: r.triggerOptions(node)},
			}
		case contract.TableChecksTab:
			return []contract.FormField{
				{ID: "checks", Name: "Checks", Type: "array", Fields: r.checkOptions()},
			}
		case contract.TableKeysTab:
			return []contract.FormField{
				{ID: "keys", Name: "Keys", Type: "array", Fields: r.getKeyOptions(node)},
			}
		}
	}
	return []contract.FormField{}
}
