package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) databaseFields() []contract.FormField {
	return []contract.FormField{
		{ID: "datname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
		{ID: "template", Name: "Template", Type: contract.FormFieldTypeSelect, Fields: r.templateOptions()},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Fields: r.tablespaceOptions()},
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

func (r *PostgresRepository) tableFields(action contract.TreeNodeActionName) []contract.FormField {
	return []contract.FormField{
		{ID: "relname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "description", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "persistence", Name: "Persistence", Type: contract.FormFieldTypeSelect, Fields: r.persistenceOptions(action)},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Fields: r.tablespaceOptions()},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) tableColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "data_type", Name: "Data Type", Type: contract.FormFieldTypeSelect, Fields: r.dataTypeOptions(), Required: true},
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

func (r *PostgresRepository) foreignKeyOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "target_table", Name: "Target Table", Type: contract.FormFieldTypeSelect, Fields: r.tablesList(node), Required: true},
		{ID: "ref_columns", Name: "Source Columns", Type: contract.FormFieldTypeMultiSelect, Fields: r.tableColumnsList(node), Required: true},
		{ID: "target_columns", Name: "Target Columns", Type: contract.FormFieldTypeMultiSelect, Required: true},
		{ID: "update_action", Name: "On Update", Type: contract.FormFieldTypeSelect, Fields: []contract.FormField{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "CASCADE", Name: "CASCADE"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
		}},
		{ID: "delete_action", Name: "On Delete", Type: contract.FormFieldTypeSelect, Fields: []contract.FormField{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "CASCADE", Name: "CASCADE"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
		}},
		{ID: "is_deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *PostgresRepository) getKeyOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "primary", Name: "Primary", Type: contract.FormFieldTypeCheckBox},
		{ID: "deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
		{ID: "columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Fields: r.tableColumnsList(node)},
		{ID: "exclude_operator", Name: "Exclude operator", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) templateOptions() []contract.FormField {
	templates, err := r.getTemplates()
	if err != nil {
		return []contract.FormField{}
	}

	var options []contract.FormField
	for _, template := range templates {
		options = append(options, contract.FormField{Value: template.Name, Name: template.Name})
	}
	return options
}

func (r *PostgresRepository) indexOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "unique", Name: "Unique", Type: contract.FormFieldTypeCheckBox},
		{ID: "columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Fields: r.tableColumnsList(node)},
		{ID: "condition", Name: "Condition", Type: contract.FormFieldTypeText},
		{ID: "include_columns", Name: "Include Columns", Type: contract.FormFieldTypeText},
		{ID: "access_method", Name: "Access Method", Type: contract.FormFieldTypeSelect, Fields: []contract.FormField{
			{Value: "btree", Name: "btree"},
			{Value: "hash", Name: "hash"},
			{Value: "gin", Name: "gin"},
			{Value: "gist", Name: "gist"},
			{Value: "spgist", Name: "spgist"},
			{Value: "brin", Name: "brin"},
		}},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Fields: r.tablespaceOptions()},
	}
}

func (r *PostgresRepository) triggerOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "timing", Name: "Timing", Type: contract.FormFieldTypeSelect, Required: true, Fields: []contract.FormField{
			{Value: "BEFORE", Name: "BEFORE"},
			{Value: "AFTER", Name: "AFTER"},
			{Value: "INSTEAD OF", Name: "INSTEAD OF"},
		}},
		{ID: "level", Name: "Level", Type: contract.FormFieldTypeSelect, Required: true, Fields: []contract.FormField{
			{Value: "FOR EACH ROW", Name: "FOR EACH ROW"},
			{Value: "FOR EACH STATEMENT", Name: "FOR EACH STATEMENT"},
		}},
		{ID: "events", Name: "Events", Type: contract.FormFieldTypeMultiSelect, Required: true, Fields: []contract.FormField{
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
			{Value: "TRUNCATE", Name: "TRUNCATE"},
		}},
		{ID: "update_columns", Name: "Update Columns", Type: contract.FormFieldTypeMultiSelect, Fields: r.tableColumnsList(node)},
		{ID: "function", Name: "Function", Type: contract.FormFieldTypeSelect, Required: true, Fields: r.triggerFunctionOptions()},
		{ID: "when", Name: "When Condition", Type: contract.FormFieldTypeText},
		{ID: "no_inherit", Name: "No Inherit", Type: contract.FormFieldTypeCheckBox},
		{ID: "enable", Name: "Enable", Type: contract.FormFieldTypeCheckBox},
		{ID: "truncate_cascade", Name: "Truncate Cascade", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *PostgresRepository) triggerFunctionOptions() []contract.FormField {
	type functionResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []functionResult
	err := r.db.Table("pg_proc").
		Select("oid as value, proname as name").
		Where("proname LIKE 'trigger_%'").
		Scan(&results).Error
	if err != nil {
		return []contract.FormField{}
	}

	options := make([]contract.FormField, len(results))
	for i, result := range results {
		options[i] = contract.FormField{Value: result.Value, Name: result.Name}
	}
	return options
}

func (r *PostgresRepository) checkOptions() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
		{ID: "no_inherit", Name: "No Inherit", Type: contract.FormFieldTypeCheckBox},
		{ID: "predicate", Name: "Predicate", Type: contract.FormFieldTypeText},
	}
}

func (r *PostgresRepository) persistenceOptions(action contract.TreeNodeActionName) []contract.FormField {
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

func (r *PostgresRepository) dataTypeOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "bigint", Name: "bigint"},
		{Value: "bigserial", Name: "bigserial"},
		{Value: "bit", Name: "bit"},
		{Value: "bit varying", Name: "bit varying"},
		{Value: "boolean", Name: "boolean"},
		{Value: "box", Name: "box"},
		{Value: "bytea", Name: "bytea"},
		{Value: "character", Name: "character"},
		{Value: "character varying", Name: "character varying"},
		{Value: "cidr", Name: "cidr"},
		{Value: "circle", Name: "circle"},
		{Value: "date", Name: "date"},
		{Value: "double precision", Name: "double precision"},
		{Value: "inet", Name: "inet"},
		{Value: "integer", Name: "integer"},
		{Value: "interval", Name: "interval"},
		{Value: "json", Name: "json"},
		{Value: "jsonb", Name: "jsonb"},
		{Value: "line", Name: "line"},
		{Value: "lseg", Name: "lseg"},
		{Value: "macaddr", Name: "macaddr"},
		{Value: "money", Name: "money"},
		{Value: "numeric", Name: "numeric"},
		{Value: "path", Name: "path"},
		{Value: "pg_lsn", Name: "pg_lsn"},
		{Value: "point", Name: "point"},
		{Value: "polygon", Name: "polygon"},
		{Value: "real", Name: "real"},
		{Value: "smallint", Name: "smallint"},
		{Value: "smallserial", Name: "smallserial"},
		{Value: "serial", Name: "serial"},
		{Value: "text", Name: "text"},
		{Value: "time", Name: "time"},
		{Value: "time with time zone", Name: "time with time zone"},
		{Value: "time without time zone", Name: "time without time zone"},
		{Value: "timestamp", Name: "timestamp"},
		{Value: "timestamp with time zone", Name: "timestamp with time zone"},
		{Value: "timestamp without time zone", Name: "timestamp without time zone"},
		{Value: "tsquery", Name: "tsquery"},
		{Value: "tsvector", Name: "tsvector"},
		{Value: "txid_snapshot", Name: "txid_snapshot"},
		{Value: "uuid", Name: "uuid"},
		{Value: "xml", Name: "xml"},
	}
}

func (r *PostgresRepository) tableColumnsList(node PGNode) []contract.FormField {
	type columnResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []columnResult
	err := r.db.Table("pg_attribute a").
		Select("a.attname as value, a.attname as name").
		Joins("JOIN pg_class c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Where("n.nspname = ? AND c.relname = ? AND a.attnum > 0 AND NOT a.attisdropped",
			node.Schema, node.Table).
		Order("a.attnum").
		Scan(&results).Error

	if err != nil {
		return []contract.FormField{}
	}

	columns := make([]contract.FormField, len(results))
	for i, result := range results {
		columns[i] = contract.FormField{
			ID:    result.Value,
			Value: result.Value,
			Name:  result.Name,
		}
	}
	return columns
}

func (r *PostgresRepository) tablesList(node PGNode) []contract.FormField {
	type tableResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []tableResult
	err := r.db.Table("pg_class c").
		Select("c.relname as value, c.relname as name").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Where("n.nspname = ? AND c.relkind = 'r'", node.Schema).
		Order("c.relname").
		Scan(&results).Error
	if err != nil {
		return []contract.FormField{}
	}

	tables := make([]contract.FormField, len(results))
	for i, result := range results {
		tables[i] = contract.FormField{
			ID:    result.Value,
			Value: result.Value,
			Name:  result.Name,
		}
	}

	return tables
}

func (r *PostgresRepository) tablespaceOptions() []contract.FormField {
	type tablespaceResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []tablespaceResult
	err := r.db.Table("pg_tablespace").
		Select("spcname as value, spcname as name").
		Order("spcname").
		Scan(&results).Error
	if err != nil {
		return []contract.FormField{}
	}

	tablespaces := make([]contract.FormField, len(results))
	for i, result := range results {
		tablespaces[i] = contract.FormField{
			Value: result.Value,
			Name:  result.Name,
		}
	}

	return tablespaces
}

func (r *PostgresRepository) viewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "check_option", Name: "Check Option", Type: contract.FormFieldTypeSelect, Fields: []contract.FormField{
			{Value: "LOCAL", Name: "LOCAL"},
			{Value: "CASCADE", Name: "CASCADE"},
		}},
		{ID: "query", Name: "Query", Type: "query", Required: true},
	}
}

func (r *PostgresRepository) materializedViewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "tablespace", Name: "Tablespace", Type: contract.FormFieldTypeSelect, Fields: r.tablespaceOptions()},
		{ID: "rolname", Name: "Owner", Type: contract.FormFieldTypeText},
		{ID: "query", Name: "Query", Type: "query", Required: true},
	}
}

func (r *PostgresRepository) sequenceFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "increment", Name: "Increment", Type: contract.FormFieldTypeText},
		{ID: "min_value", Name: "Min Value", Type: contract.FormFieldTypeText},
		{ID: "max_value", Name: "Max Value", Type: contract.FormFieldTypeText},
		{ID: "start_value", Name: "Start Value", Type: contract.FormFieldTypeText},
		{ID: "cache", Name: "Cache", Type: contract.FormFieldTypeText},
		{ID: "cycle", Name: "Cycle", Type: contract.FormFieldTypeCheckBox},
		{ID: "owned_by", Name: "Owned By", Type: contract.FormFieldTypeText},
	}
}
