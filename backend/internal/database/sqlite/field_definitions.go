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
		{ID: "target_table", Name: "Target Table", Type: "select", Fields: r.tablesList(node), Required: true},
		{ID: "ref_columns", Name: "Source Columns", Type: "multi-select", Fields: r.tableColumnsList(node), Required: true},
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

func (r *SQLiteRepository) dataTypeOptions() []contract.FormField {
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

func (r *SQLiteRepository) tableColumnsList(node string) []contract.FormField {
	type columnResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []columnResult
	err := r.db.Table("pg_attribute a").
		Select("a.attname as value, a.attname as name").
		Joins("JOIN pg_class c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
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

func (r *SQLiteRepository) tablesList(node string) []contract.FormField {
	type tableResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []tableResult
	err := r.db.Table("pg_class c").
		Select("c.relname as value, c.relname as name").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
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

func (r *SQLiteRepository) encodingOptions() []contract.FormField {
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

func (r *SQLiteRepository) viewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: "text", Required: true},
		{ID: "query", Name: "Query", Type: "query", Required: true},
	}
}
