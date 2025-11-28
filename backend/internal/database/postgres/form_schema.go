package databasePostgres

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) databaseFields(ctx context.Context) []contract.FormField {
	return []contract.FormField{
		{ID: "datname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
		{ID: "template", Name: "Template", Type: contract.FormFieldTypeSelect, Options: r.templateOptions(ctx)},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Options: r.tablespaceOptions(ctx)},
		{ID: "description", Name: "Comment", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) schemaFields() []contract.FormField {
	return []contract.FormField{
		{ID: "nspname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
		{ID: "description", Name: "Comment", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) tableFields(ctx context.Context, action contract.TreeNodeActionName) []contract.FormField {
	return []contract.FormField{
		{ID: "relname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "description", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "persistence", Name: "Persistence", Type: contract.FormFieldTypeSelect, Options: r.persistenceOptions(action)},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Options: r.tablespaceOptions(ctx)},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) tableColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "data_type", Name: "Data Type", Type: contract.FormFieldTypeSelect, Options: r.dataTypeOptions(), Required: true},
		{ID: "not_null", Name: "Not Null", Type: contract.FormFieldTypeCheckBox},
		{ID: "primary", Name: "Primary", Type: contract.FormFieldTypeCheckBox},
		{ID: "column_default", Name: "Default", Type: contract.FormFieldTypeText},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "character_maximum_length", Name: "Max length", Type: contract.FormFieldTypeText},
		{ID: "numeric_scale", Name: "Numeric scale", Type: contract.FormFieldTypeText},
		{ID: "is_identity", Name: "Is identity", Type: contract.FormFieldTypeCheckBox},
		{ID: "is_generated", Name: "Is generated", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *PostgresRepository) foreignKeyFields(ctx context.Context, node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "target_table", Name: "Target Table", Type: contract.FormFieldTypeSelect, Options: r.tablesListOptions(ctx, node), Required: true},
		{ID: "ref_columns", Name: "Source Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsOptions(ctx, node), Required: true},
		{
			ID:       "target_columns",
			Name:     "Target Columns",
			Type:     contract.FormFieldTypeMultiSelect,
			Required: true,
			DependsOn: &contract.FieldDependency{
				FieldID: "target_table",
				Parameters: map[string]string{
					"field": "columns",
					"table": "?",
				},
			},
		},
		{ID: "update_action", Name: "On Update", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "NO ACTION", Label: "NO ACTION"},
			{Value: "RESTRICT", Label: "RESTRICT"},
			{Value: "CASCADE", Label: "CASCADE"},
			{Value: "SET NULL", Label: "SET NULL"},
			{Value: "SET DEFAULT", Label: "SET DEFAULT"},
		}},
		{ID: "delete_action", Name: "On Delete", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "NO ACTION", Label: "NO ACTION"},
			{Value: "RESTRICT", Label: "RESTRICT"},
			{Value: "CASCADE", Label: "CASCADE"},
			{Value: "SET NULL", Label: "SET NULL"},
			{Value: "SET DEFAULT", Label: "SET DEFAULT"},
		}},
		{ID: "is_deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *PostgresRepository) keyFields(ctx context.Context, node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "primary", Name: "Primary", Type: contract.FormFieldTypeCheckBox},
		{ID: "deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
		{ID: "columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsOptions(ctx, node)},
		{ID: "exclude_operator", Name: "Exclude operator", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) viewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "check_option", Name: "Check Option", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "LOCAL", Label: "LOCAL"},
			{Value: "CASCADE", Label: "CASCADE"},
		}},
		{ID: "query", Name: "Query", Type: contract.FormFieldTypeQuery, Required: true},
	}
}

func (r *PostgresRepository) materializedViewFields(ctx context.Context) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Options: r.tablespaceOptions(ctx)},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
		{ID: "query", Name: "Query", Type: contract.FormFieldTypeQuery, Required: true},
	}
}

func (r *PostgresRepository) persistenceOptions(action contract.TreeNodeActionName) []contract.FormFieldOption {
	if action == contract.EditTableAction {
		return []contract.FormFieldOption{
			{Value: "LOGGED", Label: "LOGGED"},
			{Value: "UNLOGGED", Label: "UNLOGGED"},
		}
	}

	return []contract.FormFieldOption{
		{Value: "LOGGED", Label: "LOGGED"},
		{Value: "UNLOGGED", Label: "UNLOGGED"},
		{Value: "TEMPORARY", Label: "TEMPORARY"},
	}
}

func (r *PostgresRepository) dataTypeOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "bigint", Label: "bigint"},
		{Value: "bigserial", Label: "bigserial"},
		{Value: "bit", Label: "bit"},
		{Value: "bit varying", Label: "bit varying"},
		{Value: "boolean", Label: "boolean"},
		{Value: "box", Label: "box"},
		{Value: "bytea", Label: "bytea"},
		{Value: "character", Label: "character"},
		{Value: "character varying", Label: "character varying"},
		{Value: "cidr", Label: "cidr"},
		{Value: "circle", Label: "circle"},
		{Value: "date", Label: "date"},
		{Value: "double precision", Label: "double precision"},
		{Value: "inet", Label: "inet"},
		{Value: "integer", Label: "integer"},
		{Value: "interval", Label: "interval"},
		{Value: "json", Label: "json"},
		{Value: "jsonb", Label: "jsonb"},
		{Value: "line", Label: "line"},
		{Value: "lseg", Label: "lseg"},
		{Value: "macaddr", Label: "macaddr"},
		{Value: "money", Label: "money"},
		{Value: "numeric", Label: "numeric"},
		{Value: "path", Label: "path"},
		{Value: "pg_lsn", Label: "pg_lsn"},
		{Value: "point", Label: "point"},
		{Value: "polygon", Label: "polygon"},
		{Value: "real", Label: "real"},
		{Value: "smallint", Label: "smallint"},
		{Value: "smallserial", Label: "smallserial"},
		{Value: "serial", Label: "serial"},
		{Value: "text", Label: "text"},
		{Value: "time", Label: "time"},
		{Value: "time with time zone", Label: "time with time zone"},
		{Value: "time without time zone", Label: "time without time zone"},
		{Value: "timestamp", Label: "timestamp"},
		{Value: "timestamp with time zone", Label: "timestamp with time zone"},
		{Value: "timestamp without time zone", Label: "timestamp without time zone"},
		{Value: "tsquery", Label: "tsquery"},
		{Value: "tsvector", Label: "tsvector"},
		{Value: "txid_snapshot", Label: "txid_snapshot"},
		{Value: "uuid", Label: "uuid"},
		{Value: "xml", Label: "xml"},
	}
}

func (r *PostgresRepository) templateOptions(ctx context.Context) []contract.FormFieldOption {
	templates, err := r.templates(ctx, true)
	if err != nil {
		return []contract.FormFieldOption{}
	}

	var options []contract.FormFieldOption
	for _, template := range templates {
		options = append(options, contract.FormFieldOption{Value: template.Name, Label: template.Name})
	}
	return options
}

func (r *PostgresRepository) tablespaceOptions(ctx context.Context) []contract.FormFieldOption {
	tablespaces, err := r.tablespaces(ctx, true)
	if err != nil {
		return []contract.FormFieldOption{}
	}

	tablespacesOptions := make([]contract.FormFieldOption, len(tablespaces))
	for i, tablespace := range tablespaces {
		tablespacesOptions[i] = contract.FormFieldOption{
			Value: tablespace.Name,
			Label: tablespace.Name,
		}
	}

	return tablespacesOptions
}

func (r *PostgresRepository) tablesListOptions(ctx context.Context, node PGNode) []contract.FormFieldOption {
	tables, err := r.tables(ctx, &node.Schema, true)
	if err != nil {
		return []contract.FormFieldOption{}
	}

	tablesOptions := make([]contract.FormFieldOption, len(tables))
	for i, table := range tables {
		tablesOptions[i] = contract.FormFieldOption{
			Value: table.Name,
			Label: table.Name,
		}
	}

	return tablesOptions
}

func (r *PostgresRepository) tableColumnsOptions(ctx context.Context, node PGNode) []contract.FormFieldOption {
	columns, err := r.columns(ctx, &node.Table, &node.Schema, []string{}, true, true)
	if err != nil {
		return []contract.FormFieldOption{}
	}

	columnsOptions := make([]contract.FormFieldOption, len(columns))
	for i, column := range columns {
		columnsOptions[i] = contract.FormFieldOption{
			Value: column.ColumnName,
			Label: column.ColumnName,
		}
	}

	return columnsOptions
}
