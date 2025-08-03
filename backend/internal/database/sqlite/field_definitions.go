package databaseSqlite

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *SQLiteRepository) tableFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "temporary", Name: "Is temporary", Type: contract.FormFieldTypeCheckBox},
		{ID: "strict", Name: "Is strict", Type: contract.FormFieldTypeCheckBox},
		{ID: "without_rowid", Name: "Without rowid", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *SQLiteRepository) tableColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "type", Name: "Data Type", Type: contract.FormFieldTypeSelect, Fields: r.dataTypeOptions(), Required: true},
		{ID: "not_null", Name: "Not Null", Type: contract.FormFieldTypeCheckBox},
		{ID: "column_kind", Name: "Column Kind", Type: contract.FormFieldTypeSelect, Fields: r.columnKindOptions()},
		{ID: "dflt_value", Name: "Default", Type: contract.FormFieldTypeText},
		{ID: "on_null_conflicts", Name: "On Null Conflicts", Type: contract.FormFieldTypeSelect, Fields: r.onNullConflictsOptions()},
		{ID: "collection_name", Name: "Collection Name", Fields: r.collectionNameOptions()},
	}
}

func (r *SQLiteRepository) keyOptions(node string) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Fields: r.tableColumnsList(node)},
		{ID: "type", Name: "Type", Type: contract.FormFieldTypeSelect, Fields: r.keyTypeOptions(), Required: true},
	}
}

func (r *SQLiteRepository) foreignKeyOptions(node string) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Constraint Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "target_table", Name: "Target Table", Type: contract.FormFieldTypeSelect, Fields: r.tablesList(), Required: true},
		{ID: "ref_columns", Name: "Source Columns", Type: contract.FormFieldTypeMultiSelect, Fields: r.tableColumnsList(node), Required: true},
		{ID: "target_columns", Name: "Target Columns", Type: contract.FormFieldTypeMultiSelect, Required: true},
		{ID: "update_action", Name: "On Update", Type: contract.FormFieldTypeSelect, Fields: []contract.FormField{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
			{Value: "CASCADE", Name: "CASCADE"},
		}},
		{ID: "delete_action", Name: "On Delete", Type: contract.FormFieldTypeSelect, Fields: []contract.FormField{
			{Value: "NO ACTION", Name: "NO ACTION"},
			{Value: "RESTRICT", Name: "RESTRICT"},
			{Value: "SET NULL", Name: "SET NULL"},
			{Value: "SET DEFAULT", Name: "SET DEFAULT"},
			{Value: "CASCADE", Name: "CASCADE"},
		}},
		{ID: "is_deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *SQLiteRepository) dataTypeOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "INTEGER", Name: "INTEGER"},
		{Value: "INT", Name: "INT"},
		{Value: "BLOB", Name: "BLOB"},
		{Value: "ANY", Name: "ANY"},
		{Value: "TEXT", Name: "TEXT"},
		{Value: "REAL", Name: "REAL"},
	}
}

func (r *SQLiteRepository) columnKindOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "NORMAL", Name: "Normal"},
		{Value: "GENERATED_VIRTUAL", Name: "Generated Virtual"},
		{Value: "GENERATED_STORED", Name: "Generated Stored"},
	}
}

func (r *SQLiteRepository) collectionNameOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "ROLLBACK", Name: "ROLLBACK"},
		{Value: "NOCASE", Name: "NOCASE"},
		{Value: "RTRIM", Name: "RTRIM"},
	}
}

func (r *SQLiteRepository) onNullConflictsOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "ROLLBACK", Name: "ROLLBACK"},
		{Value: "ABORT", Name: "ABORT"},
		{Value: "FAIL", Name: "FAIL"},
		{Value: "IGNORE", Name: "IGNORE"},
		{Value: "REPLACE", Name: "REPLACE"},
	}
}

func (r *SQLiteRepository) tableColumnsList(node string) []contract.FormField {
	type columnResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []columnResult
	err := r.db.Raw(`
		SELECT name as value, name as name 
		FROM pragma_table_info(?) 
		WHERE name IS NOT NULL 
		ORDER BY cid
	`, node).Scan(&results).Error

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

func (r *SQLiteRepository) tablesList() []contract.FormField {
	type tableResult struct {
		Value string `gorm:"column:value"`
		Name  string `gorm:"column:name"`
	}

	var results []tableResult
	err := r.db.Raw(`
		SELECT name as value, name as name 
		FROM sqlite_master 
		WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
		ORDER BY name
	`).Scan(&results).Error
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

func (r *SQLiteRepository) viewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "query", Name: "Query", Type: "query", Required: true},
	}
}

func (r *SQLiteRepository) keyTypeOptions() []contract.FormField {
	return []contract.FormField{
		{Value: "PRIMARY KEY", Name: "PRIMARY KEY"},
		{Value: "UNIQUE", Name: "UNIQUE"},
	}
}
