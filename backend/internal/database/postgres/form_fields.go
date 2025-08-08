package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) GetFormTabs(action contract.TreeNodeActionName) []contract.FormTab {
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
			{ID: contract.TableTab, Name: "Table"},
			{ID: contract.TableColumnsTab, Name: "Columns"},
			{ID: contract.TableForeignKeysTab, Name: "Foreign Keys"},
			// {ID: contract.TableIndexesTab, Name: "Indexes"},
			// {ID: contract.TableTriggersTab, Name: "Triggers"},
			// {ID: contract.TableChecksTab, Name: "Checks"},
			// {ID: contract.TableKeysTab, Name: "Keys"},
			// {ID: contract.TableSequenceTab, Name: "Sequence"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.ViewTab, Name: "View"},
		}
	case contract.CreateMaterializedViewAction, contract.EditMaterializedViewAction:
		return []contract.FormTab{
			{ID: contract.MaterializedViewTab, Name: "Materialized View"},
		}
	default:
		return []contract.FormTab{}
	}
}

func (r *PostgresRepository) GetFormFields(nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) []contract.FormField {
	node := extractNode(nodeID)

	switch tabID {
	case contract.DatabaseTab:
		return r.databaseFields()

	case contract.SchemaTab:
		return r.schemaFields()

	case contract.TableTab:
		return r.tableFields(action)
	case contract.TableColumnsTab:
		return helper.BuildFieldArray(r.tableColumnFields())
	case contract.TableForeignKeysTab:
		return helper.BuildFieldArray(r.foreignKeyOptions(node))
	// case contract.TableIndexesTab:
	// 	return helper.BuildFieldArray(r.indexOptions(node))
	// case contract.TableTriggersTab:
	// 	return helper.BuildFieldArray(r.triggerOptions(node))
	// case contract.TableChecksTab:
	// 	return helper.BuildFieldArray(r.checkOptions())
	// case contract.TableKeysTab:
	// 	return helper.BuildFieldArray(r.getKeyOptions(node))
	// case contract.TableSequenceTab:
	// 	return helper.BuildFieldArray(r.sequenceFields())

	case contract.ViewTab:
		return r.viewFields()

	case contract.MaterializedViewTab:
		return r.materializedViewFields()
	}

	return []contract.FormField{}
}
