package databaseSqlite

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

func getAvailableActions(nodeType string) []databaseContract.TreeNodeAction {
	return []databaseContract.TreeNodeAction{}
	//switch nodeType {
	//case "database":
	//	return []string{"createTable", "createView", "createIndex"}
	//case "tableContainer":
	//	return []string{"createTable"}
	//case "viewContainer":
	//	return []string{"createView"}
	//case "indexContainer":
	//	return []string{"createIndex"}
	//case "table":
	//	return []string{"editTable", "dropTable", "copy_name"}
	//case "view":
	//	return []string{"editView", "dropView"}
	//case "index":
	//	return []string{"editIndex", "dropIndex"}
	//default:
	//	return []string{}
	//}
}

func getFormFields(action string) []databaseContract.FormField {
	switch action {
	case "createTable", "editTable":
		return []databaseContract.FormField{
			{ID: "name", Name: "TableNodeType Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
				{Value: "dataType", Name: "Data Type"},
				{Value: "notNull", Name: "Not Null"},
				{Value: "primary", Name: "Primary Key"},
			}},
		}
	case "createView", "editView":
		return []databaseContract.FormField{
			{ID: "name", Name: "ViewNodeType Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
		}
	case "createIndex", "editIndex":
		return []databaseContract.FormField{
			{ID: "name", Name: "IndexNodeType Name", Type: "text", Required: true},
			{ID: "tableName", Name: "TableNodeType Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
			}},
		}
	case "dropTable", "dropView", "dropIndex":
		return []databaseContract.FormField{
			{ID: "ifExists", Name: "If Exists", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}
