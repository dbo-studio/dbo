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
			{Value: "UTF8", Label: "UTF-8"},
			{Value: "SQL_ASCII", Label: "SQL ASCII"},
			{Value: "LATIN1", Label: "Latin-1"},
		}
		return []databaseContract.FormField{
			{ID: "name", Label: "Database Name", Type: "text", Required: true},
			{ID: "owner", Label: "Owner", Type: "text"},
			{ID: "encoding", Label: "Encoding", Type: "select", Options: encodingOptions},
			{ID: "template", Label: "Template", Type: "select", Options: templateOptions},
		}
	case "create_table", "edit_table":
		return []databaseContract.FormField{
			{ID: "name", Label: "Table Name", Type: "text", Required: true},
			{ID: "columns", Label: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Label: "Column Name"},
				{Value: "dataType", Label: "Data Type"},
				{Value: "notNull", Label: "Not Null"},
				{Value: "primary", Label: "Primary Key"},
			}},
			{ID: "temp", Label: "Temporary", Type: "checkbox"},
		}
	case "create_view", "edit_view":
		return []databaseContract.FormField{
			{ID: "name", Label: "View Name", Type: "text", Required: true},
			{ID: "query", Label: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Label: "Or Replace", Type: "checkbox"},
		}
	case "create_materialized_view", "edit_materialized_view":
		return []databaseContract.FormField{
			{ID: "name", Label: "Materialized View Name", Type: "text", Required: true},
			{ID: "query", Label: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Label: "Or Replace", Type: "checkbox"},
			{ID: "withData", Label: "With Data", Type: "checkbox"},
		}
	case "create_index", "edit_index":
		return []databaseContract.FormField{
			{ID: "name", Label: "Index Name", Type: "text", Required: true},
			{ID: "tableName", Label: "Table Name", Type: "text", Required: true},
			{ID: "columns", Label: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Label: "Column Name"},
			}},
		}
	case "create_sequence", "edit_sequence":
		return []databaseContract.FormField{
			{ID: "name", Label: "Sequence Name", Type: "text", Required: true},
		}
	case "drop_database", "drop_schema", "drop_table", "drop_view", "drop_materialized_view", "drop_index", "drop_sequence":
		return []databaseContract.FormField{
			{ID: "ifExists", Label: "If Exists", Type: "checkbox"},
			{ID: "cascade", Label: "Cascade", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}

func (r *PostgresRepository) getTemplateOptions() []databaseContract.FormFieldOption {
	var templates []string
	err := r.db.Raw("SELECT datname FROM pg_database WHERE datistemplate").Scan(&templates).Error
	if err != nil {
		return []databaseContract.FormFieldOption{{Value: "template0", Label: "template0"}, {Value: "template1", Label: "template1"}}
	}

	var options []databaseContract.FormFieldOption
	for _, template := range templates {
		options = append(options, databaseContract.FormFieldOption{Value: template, Label: template})
	}
	return options
}
