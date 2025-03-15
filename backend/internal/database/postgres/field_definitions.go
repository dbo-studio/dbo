package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

// GetDatabaseFields returns field definitions for database operations
func (r *PostgresRepository) GetDatabaseFields() map[string]contract.FormField {
	return map[string]contract.FormField{
		"datname":     {ID: "datname", Name: "Name", Type: "text", Required: true},
		"rolname":     {ID: "rolname", Name: "Owner", Type: "text"},
		"encoding":    {ID: "encoding", Name: "Encoding", Type: "select", Options: r.getEncodingOptions()},
		"template":    {ID: "template", Name: "Template", Type: "select", Options: r.getTemplateOptions()},
		"description": {ID: "description", Name: "Comment", Type: "text"},
	}
}

// GetSchemaFields returns field definitions for schema operations
func (r *PostgresRepository) GetSchemaFields() map[string]contract.FormField {
	return map[string]contract.FormField{
		"nspname":     {ID: "nspname", Name: "Name", Type: "text", Required: true},
		"rolname":     {ID: "rolname", Name: "Owner", Type: "text"},
		"description": {ID: "description", Name: "Comment", Type: "text"},
	}
}

// GetTableFields returns field definitions for table operations
func (r *PostgresRepository) GetTableFields() map[string]contract.FormField {
	return map[string]contract.FormField{
		"relname":        {ID: "relname", Name: "Name", Type: "text", Required: true},
		"description":    {ID: "description", Name: "Comment", Type: "text"},
		"relpersistence": {ID: "relpersistence", Name: "Persistence", Type: "select", Options: r.getPersistenceOptions()},
		"relpartbound":   {ID: "relpartbound", Name: "Partition Expression", Type: "text"},
		"partkeydef":     {ID: "partkeydef", Name: "Partition Key", Type: "text"},
		"reloptions":     {ID: "reloptions", Name: "Options", Type: "text"},
		"amname":         {ID: "amname", Name: "Access Method", Type: "text"},
		"spcname":        {ID: "spcname", Name: "Tablespace", Type: "select", Options: r.getTablespaceOptions()},
		"rolname":        {ID: "rolname", Name: "Owner", Type: "text"},
	}
}

// GetColumnFields returns field definitions for column operations
func (r *PostgresRepository) GetColumnFields() map[string]contract.FormField {
	return map[string]contract.FormField{
		"attname": {ID: "attname", Name: "Name", Type: "text"},
		"format_type": {
			ID:   "format_type",
			Name: "Data Type",
			Type: "select",
			Options: []contract.FormFieldOption{
				{Value: "bigserial", Name: "bigserial"},
				{Value: "bit", Name: "bit"},
				{Value: "bool", Name: "bool"},
				{Value: "box", Name: "box"},
				{Value: "bytea", Name: "bytea"},
				{Value: "char", Name: "char"},
				{Value: "cidr", Name: "cidr"},
				{Value: "circle", Name: "circle"},
				{Value: "date", Name: "date"},
				{Value: "decimal", Name: "decimal"},
				{Value: "float4", Name: "float4"},
				{Value: "float8", Name: "float8"},
				{Value: "inet", Name: "inet"},
				{Value: "int2", Name: "int2"},
				{Value: "int4", Name: "int4"},
				{Value: "int8", Name: "int8"},
				{Value: "interval", Name: "interval"},
				{Value: "json", Name: "json"},
				{Value: "jsonb", Name: "jsonb"},
				{Value: "line", Name: "line"},
				{Value: "lseg", Name: "lseg"},
				{Value: "macaddr", Name: "macaddr"},
				{Value: "money", Name: "money"},
				{Value: "numeric", Name: "numeric"},
				{Value: "path", Name: "path"},
				{Value: "point", Name: "point"},
				{Value: "polygon", Name: "polygon"},
				{Value: "serial", Name: "serial"},
				{Value: "serial2", Name: "serial2"},
				{Value: "serial4", Name: "serial4"},
				{Value: "serial8", Name: "serial8"},
				{Value: "smallserial", Name: "smallserial"},
				{Value: "text", Name: "text"},
				{Value: "time", Name: "time"},
				{Value: "timestamp", Name: "timestamp"},
				{Value: "timestamptz", Name: "timestamptz"},
				{Value: "timetz", Name: "timetz"},
				{Value: "tsquery", Name: "tsquery"},
				{Value: "tsvector", Name: "tsvector"},
				{Value: "txid_snapshot", Name: "txid_snapshot"},
				{Value: "uuid", Name: "uuid"},
				{Value: "varbit", Name: "varbit"},
				{Value: "xml", Name: "xml"},
				{Value: "character varying", Name: "character varying"},
			},
		},
		"attnotnull":     {ID: "attnotnull", Name: "Not Null", Type: "checkbox"},
		"attisprimary":   {ID: "attisprimary", Name: "Primary", Type: "checkbox"},
		"column_default": {ID: "column_default", Name: "Default", Type: "text"},
		"description":    {ID: "description", Name: "Comment", Type: "text"},
		"attoptions":     {ID: "attoptions", Name: "Options", Type: "text"},
	}
}

// GetIndexFields returns field definitions for index operations
func (r *PostgresRepository) GetIndexFields(node PGNode) map[string]contract.FormField {
	return map[string]contract.FormField{
		"indexname":   {ID: "indexname", Name: "Name", Type: "text"},
		"description": {ID: "description", Name: "Comment", Type: "text"},
		"indisunique": {ID: "indisunique", Name: "Unique", Type: "checkbox"},
		"indkey":      {ID: "indkey", Name: "Columns", Type: "multi-select", Options: r.getTableColumnsList(node)},
		"indpred":     {ID: "indpred", Name: "Condition", Type: "text"},
		"indinclude":  {ID: "indinclude", Name: "Include Columns", Type: "text"},
		"amname": {
			ID:   "amname",
			Name: "Access Method",
			Type: "select",
			Options: []contract.FormFieldOption{
				{Value: "btree", Name: "btree"},
				{Value: "hash", Name: "hash"},
				{Value: "gin", Name: "gin"},
				{Value: "gist", Name: "gist"},
				{Value: "spgist", Name: "spgist"},
				{Value: "brin", Name: "brin"},
			},
		},
		"spcname": {ID: "spcname", Name: "Tablespace", Type: "select", Options: r.getTablespaceOptions()},
	}
}
