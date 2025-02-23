package databasePostgres

import (
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func getAvailableActions(nodeType string) []string {
	switch nodeType {
	case "root":
		return []string{"create_database"}
	case "database":
		return []string{"create_schema", "create_table", "create_view", "drop_database"}
	case "schema":
		return []string{"create_table", "create_view", "create_materialized_view", "create_index", "create_sequence", "drop_schema"}
	case "table_container":
		return []string{"create_table"}
	case "view_container":
		return []string{"create_view"}
	case "materialized_view_container":
		return []string{"create_materialized_view"}
	case "index_container":
		return []string{"create_index"}
	case "sequence_container":
		return []string{"create_sequence"}
	case "table":
		return []string{"edit_table", "drop_table", "copy_name"}
	case "view":
		return []string{"edit_view", "drop_view"}
	case "materialized_view":
		return []string{"edit_materialized_view", "drop_materialized_view"}
	case "index":
		return []string{"edit_index", "drop_index"}
	case "sequence":
		return []string{"edit_sequence", "drop_sequence"}
	default:
		return []string{}
	}
}

func getFormFields(r *PostgresRepository, action string) []databaseContract.FormField {
	switch action {
	case "create_database":
		templateOptions := r.getTemplateOptions()
		encodingOptions := []databaseContract.FormFieldOption{
			{Value: "UTF8", Name: "UTF-8"},
			{Value: "SQL_ASCII", Name: "SQL ASCII"},
			{Value: "LATIN1", Name: "Latin-1"},
		}
		return []databaseContract.FormField{
			{ID: "name", Name: "Database Name", Type: "text", Required: true},
			{ID: "owner", Name: "Owner", Type: "text"},
			{ID: "encoding", Name: "Encoding", Type: "select", Options: encodingOptions},
			{ID: "template", Name: "Template", Type: "select", Options: templateOptions},
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
			{ID: "temp", Name: "Temporary", Type: "checkbox"},
		}
	case "create_view", "edit_view":
		return []databaseContract.FormField{
			{ID: "name", Name: "View Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
		}
	case "create_materialized_view", "edit_materialized_view":
		return []databaseContract.FormField{
			{ID: "name", Name: "Materialized View Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
			{ID: "withData", Name: "With Data", Type: "checkbox"},
		}
	case "create_index", "edit_index":
		return []databaseContract.FormField{
			{ID: "name", Name: "Index Name", Type: "text", Required: true},
			{ID: "tableName", Name: "Table Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
			}},
		}
	case "create_sequence", "edit_sequence":
		return []databaseContract.FormField{
			{ID: "name", Name: "Sequence Name", Type: "text", Required: true},
		}
	case "drop_database", "drop_schema", "drop_table", "drop_view", "drop_materialized_view", "drop_index", "drop_sequence":
		return []databaseContract.FormField{
			{ID: "ifExists", Name: "If Exists", Type: "checkbox"},
			{ID: "cascade", Name: "Cascade", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}

func (r *PostgresRepository) getTemplateOptions() []databaseContract.FormFieldOption {
	var templates []string
	err := r.db.Raw("SELECT datname FROM pg_database WHERE datistemplate").Scan(&templates).Error
	if err != nil {
		return []databaseContract.FormFieldOption{{Value: "template0", Name: "template0"}, {Value: "template1", Name: "template1"}}
	}

	var options []databaseContract.FormFieldOption
	for _, template := range templates {
		options = append(options, databaseContract.FormFieldOption{Value: template, Name: template})
	}
	return options
}
