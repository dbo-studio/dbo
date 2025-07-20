package databaseSqlite

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *SQLiteRepository) tableFields(action contract.TreeNodeActionName) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "temporary", Name: "Is temporary", Type: "checkbox"},
		{ID: "strict", Name: "Is strict", Type: "checkbox"},
		{ID: "without_rowid", Name: "Without rowid", Type: "checkbox"},
	}
}

func (r *SQLiteRepository) tableColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "type", Name: "Data Type", Type: "select", Fields: r.dataTypeOptions(), Required: true},
		{ID: "not_null", Name: "Not Null", Type: "checkbox"},
		{ID: "dflt_value", Name: "Default", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "character_maximum_length", Name: "Max length", Type: "text"},
		{ID: "numeric_scale", Name: "Numeric scale", Type: "text"},
		{ID: "is_identity", Name: "Is identity", Type: "checkbox"},
		{ID: "is_generated", Name: "Is generated", Type: "checkbox"},
	}
}

func (r *SQLiteRepository) foreignKeyOptions(node string) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: "text", Required: true},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "ref_columns", Name: "Source Columns", Type: "multi-select", Fields: r.tableColumnsList(node), Required: true},
		{ID: "target_table", Name: "Target Table", Type: "select", Fields: r.tablesList(node), Required: true},
		{ID: "target_columns", Name: "Target Columns", Type: "chip", Required: true},
		{ID: "update_action", Name: "On Update", Type: "select", Fields: []contract.FormField{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "CASCADE", Name: "CASCADE"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
		}},
		{ID: "delete_action", Name: "On Delete", Type: "select", Fields: []contract.FormField{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "CASCADE", Name: "CASCADE"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
		}},
		{ID: "is_deferrable", Name: "Deferrable", Type: "checkbox"},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: "checkbox"},
	}
}

func (r *SQLiteRepository) getKeyOptions(tableName string) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "primary", Name: "Primary", Type: "checkbox"},
		{ID: "deferrable", Name: "Deferrable", Type: "checkbox"},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: "checkbox"},
		{ID: "columns", Name: "Columns", Type: "multi-select", Fields: r.tableColumnsList(tableName)},
		{ID: "exclude_operator", Name: "Exclude operator", Type: "text"},
	}
}

func (r *SQLiteRepository) indexOptions(tableName string) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "unique", Name: "Unique", Type: "checkbox"},
		{ID: "columns", Name: "Columns", Type: "multi-select", Fields: r.tableColumnsList(tableName)},
		{ID: "condition", Name: "Condition", Type: "text"},
		{ID: "include_columns", Name: "Include Columns", Type: "text"},
		{ID: "access_method", Name: "Access Method", Type: "select", Fields: []contract.FormField{
			{Value: "btree", Name: "btree"},
			{Value: "hash", Name: "hash"},
			{Value: "gin", Name: "gin"},
			{Value: "gist", Name: "gist"},
			{Value: "spgist", Name: "spgist"},
			{Value: "brin", Name: "brin"},
		}},
	}
}

func (r *SQLiteRepository) checkOptions() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "deferrable", Name: "Deferrable", Type: "checkbox"},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: "checkbox"},
		{ID: "no_inherit", Name: "No Inherit", Type: "checkbox"},
		{ID: "predicate", Name: "Predicate", Type: "text"},
	}
}

func (r *SQLiteRepository) persistenceOptions(action contract.TreeNodeActionName) []contract.FormField {
	if action == contract.EditTableAction {
		return []contract.FormField{
			{Value: "LOGGED", Name: "LOGGED"},
			{Value: "UNLOGGED", Name: "UNLOGGED"},
		}
	}

	return []contract.FormField{
		{Value: "LOGGED", Name: "LOGGED"},
		{Value: "UNLOGGED", Name: "UNLOGGED"},
		{Value: "TEMPORARY", Name: "TEMPORARY"},
	}
}

func (r *SQLiteRepository) dataTypeOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "INTEGER", Name: "INTEGER"},
		{Value: "REAL", Name: "REAL"},
		{Value: "TEXT", Name: "TEXT"},
		{Value: "BLOB", Name: "BLOB"},
		{Value: "BOOLEAN", Name: "BOOLEAN"},
		{Value: "DATE", Name: "DATE"},
		{Value: "DATETIME", Name: "DATETIME"},
		{Value: "TIME", Name: "TIME"},
		{Value: "NUMERIC", Name: "NUMERIC"},
		{Value: "VARCHAR", Name: "VARCHAR"},
		{Value: "CHAR", Name: "CHAR"},
		{Value: "FLOAT", Name: "FLOAT"},
		{Value: "DOUBLE", Name: "DOUBLE"},
		{Value: "INT", Name: "INT"},
		{Value: "BOOL", Name: "BOOL"},
	}
}

func (r *SQLiteRepository) tableColumnsList(tableName string) []contract.FormField {
	columns, err := r.getColumns(tableName, nil, false)
	if err != nil {
		return []contract.FormField{}
	}

	formFields := make([]contract.FormField, len(columns))
	for i, column := range columns {
		formFields[i] = contract.FormField{
			ID:    column.ColumnName,
			Value: column.ColumnName,
			Name:  column.ColumnName,
		}
	}
	return formFields
}

func (r *SQLiteRepository) tablesList(schema string) []contract.FormField {
	tables, err := r.getAllTableList()
	if err != nil {
		return []contract.FormField{}
	}

	formFields := make([]contract.FormField, len(tables))
	for i, table := range tables {
		formFields[i] = contract.FormField{
			ID:    table.Name,
			Value: table.Name,
			Name:  table.Name,
		}
	}

	return formFields
}

func (r *SQLiteRepository) viewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "check_option", Name: "Check Option", Type: "select", Fields: []contract.FormField{
			{Value: "LOCAL", Name: "LOCAL"},
			{Value: "CASCADE", Name: "CASCADE"},
		}},
		{ID: "query", Name: "Query", Type: "query", Required: true},
	}
}
