package databasePostgres

import contract "github.com/dbo-studio/dbo/internal/database/contract"

func (r *PostgresRepository) FormFields(action contract.TreeNodeActionName) []contract.FormField {
	switch action {
	case contract.CreateDatabaseAction:
		templateOptions := r.getTemplateOptions()
		encodingOptions := []contract.FormFieldOption{
			{Value: "UTF8", Name: "UTF-8"},
			{Value: "SQL_ASCII", Name: "SQL ASCII"},
			{Value: "LATIN1", Name: "Latin-1"},
		}
		return []contract.FormField{
			{ID: "name", Name: "DatabaseNodeType Name", Type: "text", Required: true},
			{ID: "owner", Name: "Owner", Type: "text"},
			{ID: "encoding", Name: "Encoding", Type: "select", Options: encodingOptions},
			{ID: "template", Name: "Template", Type: "select", Options: templateOptions},
		}
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormField{
			{ID: "name", Name: "TableNodeType Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []contract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
				{Value: "dataType", Name: "Data Type"},
				{Value: "notNull", Name: "Not Null"},
				{Value: "primary", Name: "Primary Key"},
			}},
			{ID: "temp", Name: "Temporary", Type: "checkbox"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormField{
			{ID: "name", Name: "ViewNodeType Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
		}
	case contract.CreateMaterializedViewAction, contract.EditMaterializedViewAction:
		return []contract.FormField{
			{ID: "name", Name: "Materialized ViewNodeType Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
			{ID: "withData", Name: "With Data", Type: "checkbox"},
		}
	case contract.CreateIndexAction, contract.EditIndexAction:
		return []contract.FormField{
			{ID: "name", Name: "IndexNodeType Name", Type: "text", Required: true},
			{ID: "tableName", Name: "TableNodeType Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []contract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
			}},
		}
	case contract.CreateSequenceAction, contract.EditSequenceAction:
		return []contract.FormField{
			{ID: "name", Name: "SequenceNodeType Name", Type: "text", Required: true},
		}
	case contract.DropDatabaseAction, contract.DropSchemaAction, contract.DropTableAction, contract.DropViewAction,
		contract.DropMaterializedViewAction, contract.DropIndexAction, contract.DropSequenceAction:
		return []contract.FormField{
			{ID: "ifExists", Name: "If Exists", Type: "checkbox"},
			{ID: "cascade", Name: "Cascade", Type: "checkbox"},
		}
	default:
		return []contract.FormField{}
	}
}

func (r *PostgresRepository) getTemplateOptions() []contract.FormFieldOption {
	templates, err := r.getTemplates()
	if err != nil {
		return []contract.FormFieldOption{{Value: "template0", Name: "template0"}, {Value: "template1", Name: "template1"}}
	}

	var options []contract.FormFieldOption
	for _, template := range templates {
		options = append(options, contract.FormFieldOption{Value: template.Name, Name: template.Name})
	}
	return options
}
