package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func getAvailableActions(nodeType string) []contract.TreeNodeAction {
	actions := make([]contract.TreeNodeAction, 0)

	switch nodeType {
	case "root":
		actions = append(actions, contract.TreeNodeAction{
			Name: "create_database",
			Type: contract.TreeNodeActionTypeForm,
		})
	case "database":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_schema",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "create_table",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_view",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "drop_database",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "schema":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_table",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "create_view",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_materialized_view",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_index",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_sequence",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "drop_database",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "table_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_table",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "view_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_view",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "materialized_view_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_materialized_view",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "index_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_index",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "sequence_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_sequence",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "table":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_table",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_table",
				Type: contract.TreeNodeActionTypeAction,
			},
			contract.TreeNodeAction{
				Name: "copy_name",
				Type: contract.TreeNodeActionTypeCommand,
			},
		)
	case "view":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_view",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_view",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "materialized_view":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_materialized_view",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_materialized_view",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "index":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_index",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_index",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "sequence":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_sequence",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_sequence",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	}

	return actions
}

func getFormFields(r *PostgresRepository, action string) []contract.FormField {
	switch action {
	case "create_database":
		templateOptions := r.getTemplateOptions()
		encodingOptions := []contract.FormFieldOption{
			{Value: "UTF8", Name: "UTF-8"},
			{Value: "SQL_ASCII", Name: "SQL ASCII"},
			{Value: "LATIN1", Name: "Latin-1"},
		}
		return []contract.FormField{
			{ID: "name", Name: "Database Name", Type: "text", Required: true},
			{ID: "owner", Name: "Owner", Type: "text"},
			{ID: "encoding", Name: "Encoding", Type: "select", Options: encodingOptions},
			{ID: "template", Name: "Template", Type: "select", Options: templateOptions},
		}
	case "create_table", "edit_table":
		return []contract.FormField{
			{ID: "name", Name: "Table Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []contract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
				{Value: "dataType", Name: "Data Type"},
				{Value: "notNull", Name: "Not Null"},
				{Value: "primary", Name: "Primary Key"},
			}},
			{ID: "temp", Name: "Temporary", Type: "checkbox"},
		}
	case "create_view", "edit_view":
		return []contract.FormField{
			{ID: "name", Name: "View Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
		}
	case "create_materialized_view", "edit_materialized_view":
		return []contract.FormField{
			{ID: "name", Name: "Materialized View Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
			{ID: "withData", Name: "With Data", Type: "checkbox"},
		}
	case "create_index", "edit_index":
		return []contract.FormField{
			{ID: "name", Name: "Index Name", Type: "text", Required: true},
			{ID: "tableName", Name: "Table Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []contract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
			}},
		}
	case "create_sequence", "edit_sequence":
		return []contract.FormField{
			{ID: "name", Name: "Sequence Name", Type: "text", Required: true},
		}
	case "drop_database", "drop_schema", "drop_table", "drop_view", "drop_materialized_view", "drop_index", "drop_sequence":
		return []contract.FormField{
			{ID: "ifExists", Name: "If Exists", Type: "checkbox"},
			{ID: "cascade", Name: "Cascade", Type: "checkbox"},
		}
	default:
		return []contract.FormField{}
	}
}

func (r *PostgresRepository) getTemplateOptions() []contract.FormFieldOption {
	var templates []string
	err := r.db.Raw("SELECT datname FROM pg_database WHERE datistemplate").Scan(&templates).Error
	if err != nil {
		return []contract.FormFieldOption{{Value: "template0", Name: "template0"}, {Value: "template1", Name: "template1"}}
	}

	var options []contract.FormFieldOption
	for _, template := range templates {
		options = append(options, contract.FormFieldOption{Value: template, Name: template})
	}
	return options
}
