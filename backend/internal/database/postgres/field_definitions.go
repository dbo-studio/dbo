package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) databaseFields() []contract.FormField {
	return []contract.FormField{
		{ID: "datname", Name: "Name", Type: "text", Required: true},
		{ID: "rolname", Name: "Owner", Type: "text"},
		{ID: "template", Name: "Template", Type: "select", Fields: r.templateOptions()},
		{ID: "tablespace", Name: "Tablespace", Type: "select", Fields: r.tablespaceOptions()},
		{ID: "description", Name: "Comment", Type: "text"},
	}
}

func (r *PostgresRepository) databasePrivilegeOptions() []contract.FormField {
	return []contract.FormField{
		{ID: "grantee", Name: "Grantee", Type: "text"},
		{ID: "grantor", Name: "Grantor", Type: "text"},
		{ID: "privileges", Name: "Privileges", Type: "multi-select", Fields: []contract.FormField{
			{Value: "SELECT", Name: "SELECT"},
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
		}},
	}
}

func (r *PostgresRepository) schemaFields() []contract.FormField {
	return []contract.FormField{
		{ID: "nspname", Name: "Name", Type: "text", Required: true},
		{ID: "rolname", Name: "Owner", Type: "text"},
		{ID: "description", Name: "Comment", Type: "text"},
	}
}

func (r *PostgresRepository) schemaPrivilegeOptions() []contract.FormField {
	return []contract.FormField{
		{ID: "grantee", Name: "Grantee", Type: "text"},
		{ID: "grantor", Name: "Grantor", Type: "text"},
		{ID: "privileges", Name: "Privileges", Type: "multi-select", Fields: []contract.FormField{
			{Value: "SELECT", Name: "SELECT"},
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
		}},
	}
}

func (r *PostgresRepository) tableFields() []contract.FormField {
	return []contract.FormField{
		{ID: "relname", Name: "Name", Type: "text", Required: true},
		{ID: "description", Name: "Comment", Type: "text"},
		{ID: "relpersistence", Name: "Persistence", Type: "select", Fields: r.persistenceOptions()},
		{ID: "relpartbound", Name: "Partition Expression", Type: "text"},
		{ID: "partkeydef", Name: "Partition Key", Type: "text"},
		{ID: "reloptions", Name: "Options", Type: "text"},
		{ID: "amname", Name: "Access Method", Type: "text"},
		{ID: "spcname", Name: "Tablespace", Type: "select", Fields: r.tablespaceOptions()},
		{ID: "rolname", Name: "Owner", Type: "text"},
	}
}

func (r *PostgresRepository) tableColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "column_name", Name: "Name", Type: "text"},
		{ID: "data_type", Name: "Data Type", Type: "select", Fields: r.dataTypeOptions()},
		{ID: "not_null", Name: "Not Null", Type: "checkbox"},
		{ID: "primary", Name: "Primary", Type: "checkbox"},
		{ID: "column_default", Name: "Default", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "character_maximum_length", Name: "Max length", Type: "text"},
		{ID: "numeric_scale", Name: "Numeric scale", Type: "text"},
		{ID: "is_identity", Name: "Is identity", Type: "checkbox"},
		{ID: "is_generated", Name: "Is generated", Type: "checkbox"},
	}
}

func (r *PostgresRepository) foreignKeyOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "ref_columns", Name: "Source Columns", Type: "multi-select", Fields: r.tableColumnsList(node)},
		{ID: "ref_table", Name: "Target Table", Type: "select", Fields: r.tablesList(node)},
		{ID: "target_columns", Name: "Target Columns", Type: "multi-select", Fields: r.tableColumnsList(node)},
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

func (r *PostgresRepository) getKeyOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "primary", Name: "Primary", Type: "checkbox"},
		{ID: "deferrable", Name: "Deferrable", Type: "checkbox"},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: "checkbox"},
		{ID: "columns", Name: "Columns", Type: "multi-select", Fields: r.tableColumnsList(node)},
		{ID: "exclude_operator", Name: "Exclude operator", Type: "text"},
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
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "unique", Name: "Unique", Type: "checkbox"},
		{ID: "columns", Name: "Columns", Type: "multi-select", Fields: r.tableColumnsList(node)},
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
		{ID: "tablespace", Name: "Tablespace", Type: "select", Fields: r.tablespaceOptions()},
	}
}

func (r *PostgresRepository) triggerOptions(node PGNode) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "timing", Name: "Timing", Type: "select", Required: true, Fields: []contract.FormField{
			{Value: "BEFORE", Name: "BEFORE"},
			{Value: "AFTER", Name: "AFTER"},
			{Value: "INSTEAD OF", Name: "INSTEAD OF"},
		}},
		{ID: "level", Name: "Level", Type: "select", Required: true, Fields: []contract.FormField{
			{Value: "FOR EACH ROW", Name: "FOR EACH ROW"},
			{Value: "FOR EACH STATEMENT", Name: "FOR EACH STATEMENT"},
		}},
		{ID: "events", Name: "Events", Type: "multi-select", Required: true, Fields: []contract.FormField{
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
			{Value: "TRUNCATE", Name: "TRUNCATE"},
		}},
		{ID: "update_columns", Name: "Update Columns", Type: "multi-select", Fields: r.tableColumnsList(node)},
		{ID: "function", Name: "Function", Type: "select", Required: true, Fields: r.triggerFunctionOptions(node)},
		{ID: "when", Name: "When Condition", Type: "text"},
		{ID: "no_inherit", Name: "No Inherit", Type: "checkbox"},
		{ID: "enable", Name: "Enable", Type: "checkbox"},
		{ID: "truncate_cascade", Name: "Truncate Cascade", Type: "checkbox"},
	}
}

func (r *PostgresRepository) triggerFunctionOptions(node PGNode) []contract.FormField {
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
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "deferrable", Name: "Deferrable", Type: "checkbox"},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: "checkbox"},
		{ID: "no_inherit", Name: "No Inherit", Type: "checkbox"},
		{ID: "predicate", Name: "Predicate", Type: "text"},
	}
}

func (r *PostgresRepository) persistenceOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "PERSISTENT", Name: "PERSISTENT"},
		{Value: "UNLOGGED", Name: "UNLOGGED"},
		{Value: "TEMPORARY", Name: "TEMPORARY"},
		{Value: "GLOBAL TEMPORARY", Name: "GLOBAL TEMPORARY"},
		{Value: "LOCAL TEMPORARY", Name: "LOCAL TEMPORARY"},
		{Value: "UNLOGGED TEMPORARY", Name: "UNLOGGED TEMPORARY"},
		{Value: "UNLOGGED GLOBAL TEMPORARY", Name: "UNLOGGED GLOBAL TEMPORARY"},
		{Value: "UNLOGGED LOCAL TEMPORARY", Name: "UNLOGGED LOCAL TEMPORARY"},
	}
}

func (r *PostgresRepository) dataTypeOptions() []contract.FormField {
	return []contract.FormField{
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

func (r *PostgresRepository) encodingOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "BIG5", Name: "BIG5"},
		{Value: "EUC_CN", Name: "EUC_CN"},
		{Value: "EUC_JP", Name: "EUC_JP"},
		{Value: "EUC_JIS_2004", Name: "EUC_JIS_2004"},
		{Value: "EUC_KR", Name: "EUC_KR"},
		{Value: "EUC_TW", Name: "EUC_TW"},
		{Value: "GB18030", Name: "GB18030"},
		{Value: "GBK", Name: "GBK"},
		{Value: "ISO_8859_1", Name: "ISO_8859_1"},
		{Value: "ISO_8859_2", Name: "ISO_8859_2"},
		{Value: "ISO_8859_3", Name: "ISO_8859_3"},
		{Value: "ISO_8859_4", Name: "ISO_8859_4"},
		{Value: "ISO_8859_5", Name: "ISO_8859_5"},
		{Value: "ISO_8859_6", Name: "ISO_8859_6"},
		{Value: "ISO_8859_7", Name: "ISO_8859_7"},
		{Value: "ISO_8859_8", Name: "ISO_8859_8"},
		{Value: "ISO_8859_9", Name: "ISO_8859_9"},
		{Value: "ISO_8859_10", Name: "ISO_8859_10"},
		{Value: "ISO_8859_13", Name: "ISO_8859_13"},
		{Value: "ISO_8859_14", Name: "ISO_8859_14"},
		{Value: "ISO_8859_15", Name: "ISO_8859_15"},
		{Value: "ISO_8859_16", Name: "ISO_8859_16"},
		{Value: "JOHAB", Name: "JOHAB"},
		{Value: "KOI8R", Name: "KOI8R"},
		{Value: "KOI8U", Name: "KOI8U"},
		{Value: "LATIN1", Name: "LATIN1"},
		{Value: "LATIN2", Name: "LATIN2"},
		{Value: "LATIN3", Name: "LATIN3"},
		{Value: "LATIN4", Name: "LATIN4"},
		{Value: "LATIN5", Name: "LATIN5"},
		{Value: "LATIN6", Name: "LATIN6"},
		{Value: "LATIN7", Name: "LATIN7"},
		{Value: "LATIN8", Name: "LATIN8"},
		{Value: "LATIN9", Name: "LATIN9"},
		{Value: "LATIN10", Name: "LATIN10"},
		{Value: "MULE_INTERNAL", Name: "MULE_INTERNAL"},
		{Value: "SJIS", Name: "SJIS"},
		{Value: "SHIFT_JIS_2004", Name: "SHIFT_JIS_2004"},
		{Value: "SQL_ASCII", Name: "SQL_ASCII"},
		{Value: "UHC", Name: "UHC"},
		{Value: "UTF8", Name: "UTF8"},
		{Value: "WIN866", Name: "WIN866"},
		{Value: "WIN874", Name: "WIN874"},
		{Value: "WIN1250", Name: "WIN1250"},
		{Value: "WIN1251", Name: "WIN1251"},
		{Value: "WIN1252", Name: "WIN1252"},
		{Value: "WIN1253", Name: "WIN1253"},
		{Value: "WIN1254", Name: "WIN1254"},
		{Value: "WIN1255", Name: "WIN1255"},
		{Value: "WIN1256", Name: "WIN1256"},
		{Value: "WIN1257", Name: "WIN1257"},
		{Value: "WIN1258", Name: "WIN1258"},
	}
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
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "check_option", Name: "Check Option", Type: "select", Fields: []contract.FormField{
			{Value: "LOCAL", Name: "LOCAL"},
			{Value: "CASCADE", Name: "CASCADE"},
		}},
		{ID: "query", Name: "Query", Type: "query"},
	}
}

func (r *PostgresRepository) viewPrivilegeOptions() []contract.FormField {
	return []contract.FormField{
		{ID: "grantee", Name: "Grantee", Type: "text"},
		{ID: "privileges", Name: "Privileges", Type: "multi-select", Fields: []contract.FormField{
			{Value: "SELECT", Name: "SELECT"},
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
		}},
	}
}

func (r *PostgresRepository) materializedViewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "withs", Name: "Withs", Type: "text"},
		{ID: "tablespace", Name: "Tablespace", Type: "select", Fields: r.tablespaceOptions()},
		{ID: "query", Name: "Query", Type: "query"},
	}
}

func (r *PostgresRepository) materializedViewPrivilegeOptions() []contract.FormField {
	return []contract.FormField{
		{ID: "grantee", Name: "Grantee", Type: "text"},
		{ID: "grantor", Name: "Grantor", Type: "text"},
		{ID: "privileges", Name: "Privileges", Type: "multi-select", Fields: []contract.FormField{
			{Value: "SELECT", Name: "SELECT"},
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
		}},
	}
}

func (r *PostgresRepository) sequenceFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "increment", Name: "Increment", Type: "text"},
		{ID: "min_value", Name: "Min Value", Type: "text"},
		{ID: "max_value", Name: "Max Value", Type: "text"},
		{ID: "start_value", Name: "Start Value", Type: "text"},
		{ID: "cache", Name: "Cache", Type: "text"},
		{ID: "cycle", Name: "Cycle", Type: "checkbox"},
		{ID: "owned_by", Name: "Owned By", Type: "text"},
	}
}
