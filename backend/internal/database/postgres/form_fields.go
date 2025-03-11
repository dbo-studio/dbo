package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) GetFormTabs(action contract.TreeNodeActionName) []contract.FormTab {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		return []contract.FormTab{
			{ID: contract.GeneralTab, Name: "General"},
		}
	case contract.CreateSchemaAction, contract.EditSchemaAction:
		return []contract.FormTab{
			{ID: contract.GeneralTab, Name: "General"},
			{ID: contract.PrivilegesTab, Name: "Privileges"},
		}
	case contract.CreateTableAction, contract.EditTableAction:
		return []contract.FormTab{
			{ID: contract.TableTab, Name: "Table"},
			{ID: contract.ColumnsTab, Name: "Columns"},
			{ID: contract.ForeignKeysTab, Name: "Foreign Keys"},
			{ID: contract.IndexesTab, Name: "Indexes"},
			{ID: contract.TriggersTab, Name: "Triggers"},
			{ID: contract.ChecksTab, Name: "Checks"},
		}
	case contract.CreateViewAction, contract.EditViewAction:
		return []contract.FormTab{
			{ID: contract.GeneralTab, Name: "General"},
			{ID: contract.DefinitionTab, Name: "Definition"},
			{ID: contract.PrivilegesTab, Name: "Privileges"},
		}
	case contract.CreateMaterializedViewAction, contract.EditMaterializedViewAction:
		return []contract.FormTab{
			{ID: contract.GeneralTab, Name: "General"},
			{ID: contract.DefinitionTab, Name: "Definition"},
			{ID: contract.StorageTab, Name: "Storage"},
			{ID: contract.PrivilegesTab, Name: "Privileges"},
		}
	case contract.CreateIndexAction, contract.EditIndexAction:
		return []contract.FormTab{
			{ID: contract.GeneralTab, Name: "General"},
			{ID: contract.ColumnsTab, Name: "Columns"},
			{ID: contract.StorageTab, Name: "Storage"},
		}
	case contract.CreateSequenceAction, contract.EditSequenceAction:
		return []contract.FormTab{
			{ID: contract.GeneralTab, Name: "General"},
			{ID: contract.DefinitionTab, Name: "Definition"},
			{ID: contract.PrivilegesTab, Name: "Privileges"},
		}
	default:
		return []contract.FormTab{}
	}
}

func (r *PostgresRepository) GetFormFields(nodeID string, action contract.TreeNodeActionName, tabID contract.TreeTab) []contract.FormField {
	node := extractNode(nodeID)

	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction:
		switch tabID {
		case contract.GeneralTab:
			return []contract.FormField{
				{ID: "name", Name: "Name", Type: "text", Required: true},
				{ID: "owner", Name: "Owner", Type: "text"},
				{ID: "encoding", Name: "Encoding", Type: "select", Options: getEncodingOptions()},
				{ID: "template", Name: "Template", Type: "select", Options: r.getTemplateOptions()},
			}
		}

	case contract.CreateSchemaAction, contract.EditSchemaAction:
		switch tabID {
		case contract.GeneralTab:
			return []contract.FormField{
				{ID: "name", Name: "Name", Type: "text", Required: true},
				{ID: "owner", Name: "Owner", Type: "text"},
			}
		case contract.PrivilegesTab:
			return []contract.FormField{
				{ID: "privileges", Name: "Privileges", Type: "array", Options: getPrivilegeOptions()},
			}
		}

	case contract.CreateTableAction, contract.EditTableAction:
		switch tabID {
		case contract.TableTab:
			return []contract.FormField{
				{ID: "name", Name: "Name", Type: "text", Required: true},
				{ID: "comment", Name: "Comment", Type: "text"},
				{ID: "persistence", Name: "Persistence", Type: "select", Options: getPersistenceOptions()},
				{ID: "with_oids", Name: "With OIDs", Type: "checkbox"},
				{ID: "partition_expression", Name: "Partition Expression", Type: "text"},
				{ID: "partition_key", Name: "Partition Key", Type: "text"},
				{ID: "options", Name: "Options", Type: "text"},
				{ID: "access_method", Name: "Access Method", Type: "text"},
				{ID: "tablespace", Name: "Tablespace", Type: "select", Options: r.getTablespaceOptions()},
				{ID: "owner", Name: "Owner", Type: "text"},
			}
		case contract.ColumnsTab:
			return []contract.FormField{
				{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: getColumnOptions()},
			}
		case contract.ForeignKeysTab:
			return []contract.FormField{
				{ID: "foreign_keys", Name: "Foreign Keys", Type: "array", Options: r.getForeignKeyOptions(node)},
			}
		case contract.IndexesTab:
			return []contract.FormField{
				{ID: "indexes", Name: "Indexes", Type: "array", Options: r.getIndexOptions(node)},
			}
		case contract.TriggersTab:
			return []contract.FormField{
				{ID: "triggers", Name: "Triggers", Type: "array", Options: getTriggerOptions()},
			}
		case contract.ChecksTab:
			return []contract.FormField{
				{ID: "checks", Name: "Checks", Type: "array", Options: getCheckOptions()},
			}
		}
	}
	return []contract.FormField{}
}

func (r *PostgresRepository) getTemplateOptions() []contract.FormFieldOption {
	templates, err := r.getTemplates()
	if err != nil {
		return []contract.FormFieldOption{}
	}

	var options []contract.FormFieldOption
	for _, template := range templates {
		options = append(options, contract.FormFieldOption{Value: template.Name, Name: template.Name})
	}
	return options
}

func (r *PostgresRepository) getIndexOptions(node PGNode) []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{ID: "name", Name: "Index Name", Type: "text", Required: true},
		{ID: "columns", Name: "Columns", Type: "multi-select", Required: true, Options: r.getTableColumnsList(node)},
		{ID: "method", Name: "Method", Type: "select", Required: true, Options: []contract.FormFieldOption{
			{Value: "btree", Name: "btree"},
			{Value: "hash", Name: "hash"},
			{Value: "gin", Name: "gin"},
			{Value: "gist", Name: "gist"},
			{Value: "spgist", Name: "spgist"},
			{Value: "brin", Name: "brin"},
		}},
		{ID: "unique", Name: "Unique", Type: "checkbox"},
		{ID: "concurrent", Name: "Concurrent", Type: "checkbox"},
	}
}

func getTriggerOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "for_each", Name: "For Each", Type: "select", Required: true, Options: []contract.FormFieldOption{
			{Value: "ROW", Name: "ROW"},
			{Value: "STATEMENT", Name: "STATEMENT"},
		}},
		{ID: "fires", Name: "Fires", Type: "select", Required: true, Options: []contract.FormFieldOption{
			{Value: "BEFORE", Name: "BEFORE"},
			{Value: "AFTER", Name: "AFTER"},
			{Value: "INSTEAD OF", Name: "INSTEAD OF"},
		}},
		{ID: "INSERT", Name: "INSERT", Type: "checkbox"},
		{ID: "UPDATE", Name: "UPDATE", Type: "checkbox"},
		{ID: "DELETE", Name: "DELETE", Type: "checkbox"},
		{ID: "TRUNCATE", Name: "TRUNCATE", Type: "checkbox"},
		{ID: "function", Name: "Function", Type: "text", Required: true},
		{ID: "when", Name: "When Condition", Type: "text"},
		{ID: "enable", Name: "Enable", Type: "checkbox"},
	}
}

func getCheckOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "check", Name: "check"},
	}
}

// Helper functions to keep the code organized
func getPersistenceOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
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

func getColumnOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{ID: "name", Name: "Name", Type: "text"},
		{ID: "dataType", Name: "Data Type", Type: "select", Options: getDataTypeOptions()},
		{ID: "notNull", Name: "Not Null", Type: "checkbox"},
		{ID: "primary", Name: "Primary", Type: "checkbox"},
		{ID: "default", Name: "Default", Type: "text"},
		{ID: "comment", Name: "Comment", Type: "text"},
		{ID: "options", Name: "Options", Type: "text"},
	}
}

func getDataTypeOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
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

func (r *PostgresRepository) getForeignKeyOptions(node PGNode) []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{ID: "name", Name: "Constraint Name", Type: "text", Required: true},
		{ID: "columns", Name: "Source Columns", Type: "multi-select", Required: true, Options: r.getTableColumnsList(node)},
		{ID: "ref_table", Name: "Referenced Table", Type: "select", Required: true, Options: r.getTablesList(node)},
		{ID: "ref_columns", Name: "Referenced Columns", Type: "multi-select", Required: true, Options: r.getTableColumnsList(node)},
		{ID: "on_update", Name: "On Update", Type: "select", Required: true, Options: []contract.FormFieldOption{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "CASCADE", Name: "CASCADE"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
		}},
		{ID: "on_delete", Name: "On Delete", Type: "select", Required: true, Options: []contract.FormFieldOption{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "CASCADE", Name: "CASCADE"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
		}},
		{ID: "deferrable", Name: "Deferrable", Type: "checkbox"},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: "checkbox"},
	}
}

func (r *PostgresRepository) getTableColumnsList(node PGNode) []contract.FormFieldOption {
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
		return []contract.FormFieldOption{}
	}

	columns := make([]contract.FormFieldOption, len(results))
	for i, result := range results {
		columns[i] = contract.FormFieldOption{
			ID:    result.Value,
			Value: result.Value,
			Name:  result.Name,
		}
	}
	return columns
}

func (r *PostgresRepository) getTablesList(node PGNode) []contract.FormFieldOption {
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
		return []contract.FormFieldOption{}
	}

	tables := make([]contract.FormFieldOption, len(results))
	for i, result := range results {
		tables[i] = contract.FormFieldOption{
			ID:    result.Value,
			Value: result.Value,
			Name:  result.Name,
		}
	}

	return tables
}

func getEncodingOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
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

func getPrivilegeOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{ID: "grantee", Name: "Grantee", Type: "text"},
		{ID: "privileges", Name: "Privileges", Type: "array", Options: []contract.FormFieldOption{
			{Value: "SELECT", Name: "SELECT"},
			{Value: "INSERT", Name: "INSERT"},
			{Value: "UPDATE", Name: "UPDATE"},
			{Value: "DELETE", Name: "DELETE"},
		}},
	}
}

func (r *PostgresRepository) getTablespaceOptions() []contract.FormFieldOption {
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
		return []contract.FormFieldOption{}
	}

	tablespaces := make([]contract.FormFieldOption, len(results))
	for i, result := range results {
		tablespaces[i] = contract.FormFieldOption{
			Value: result.Value,
			Name:  result.Name,
		}
	}

	return tablespaces
}
