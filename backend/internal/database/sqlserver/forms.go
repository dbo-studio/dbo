package databaseSqlserver

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

func getAvailableActions(nodeType string) []databaseContract.TreeNodeAction {
	return []databaseContract.TreeNodeAction{}
	//switch nodeType {
	//case "root":
	//	return []string{"create_database"}
	//case "database":
	//	return []string{"create_table", "create_view", "create_index", "drop_database"}
	//case "table_container":
	//	return []string{"create_table"}
	//case "view_container":
	//	return []string{"create_view"}
	//case "index_container":
	//	return []string{"create_index"}
	//case "table":
	//	return []string{"edit_table", "drop_table", "copy_name"}
	//case "view":
	//	return []string{"edit_view", "drop_view"}
	//case "index":
	//	return []string{"edit_index", "drop_index"}
	//default:
	//	return []string{}
	//}
}

func getFormFields(action string) []databaseContract.FormField {
	switch action {
	case "create_database":
		return []databaseContract.FormField{
			{ID: "name", Name: "Database Name", Type: "text", Required: true},
		}
	case "create_table", "edit_table":
		return []databaseContract.FormField{
			{ID: "name", Name: "Table Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
				{Value: "dataType", Name: "Data Type"},
				{Value: "notNull", Name: "Not Null"},
				{Value: "primary", Name: "Primary Key"},
			}},
		}
	case "create_view", "edit_view":
		return []databaseContract.FormField{
			{ID: "name", Name: "View Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
		}
	case "create_index", "edit_index":
		return []databaseContract.FormField{
			{ID: "name", Name: "Index Name", Type: "text", Required: true},
			{ID: "tableName", Name: "Table Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
			}},
		}
	case "drop_database", "drop_table", "drop_view", "drop_index":
		return []databaseContract.FormField{}
	default:
		return []databaseContract.FormField{}
	}
}
