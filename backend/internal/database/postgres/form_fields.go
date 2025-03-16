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

func (r *PostgresRepository) GetFormFields(nodeID string, tabID contract.TreeTab) []contract.FormField {
	node := extractNode(nodeID)

	switch tabID {
	case contract.DatabaseTab:
		return r.databaseFields()
	case contract.DatabasePrivilegesTab:
		return buildFieldArray(r.databasePrivilegeOptions())

	case contract.SchemaTab:
		return r.schemaFields()
	case contract.SchemaPrivilegesTab:
		return buildFieldArray(r.schemaPrivilegeOptions())

	case contract.TableTab:
		return r.tableFields()
	case contract.TableColumnsTab:
		return buildFieldArray(r.tableColumnFields())
	case contract.TableForeignKeysTab:
		return buildFieldArray(r.foreignKeyOptions(node))
	case contract.TableIndexesTab:
		return buildFieldArray(r.indexOptions(node))
	case contract.TableTriggersTab:
		return buildFieldArray(r.triggerOptions(node))
	case contract.TableChecksTab:
		return buildFieldArray(r.checkOptions())
	case contract.TableKeysTab:
		return buildFieldArray(r.getKeyOptions(node))
	}

	return []contract.FormField{}
}

func buildFieldArray(fields []contract.FormField) []contract.FormField {
	return []contract.FormField{
		{
			ID:   "columns",
			Type: "array",
			Fields: []contract.FormField{
				{
					ID:     "empty",
					Type:   "object",
					Fields: fields,
				},
			},
		},
	}
}
