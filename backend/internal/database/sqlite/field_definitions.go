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
		{ID: "type", Name: "Data Type", Type: contract.FormFieldTypeSelect, Options: r.dataTypeOptions(), Required: true},
		{ID: "not_null", Name: "Not Null", Type: contract.FormFieldTypeCheckBox},
		{ID: "column_kind", Name: "Column Kind", Type: contract.FormFieldTypeSelect, Options: r.columnKindOptions()},
		{ID: "dflt_value", Name: "Default", Type: contract.FormFieldTypeText},
		{ID: "on_null_conflicts", Name: "On Null Conflicts", Type: contract.FormFieldTypeSelect, Options: r.onNullConflictsOptions()},
		{ID: "collection_name", Name: "Collection Name", Options: r.collectionNameOptions()},
	}
}

func (r *SQLiteRepository) keyOptions(node string) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsList(node)},
		{ID: "type", Name: "Type", Type: contract.FormFieldTypeSelect, Options: r.keyTypeOptions(), Required: true},
	}
}

func (r *SQLiteRepository) foreignKeyOptions(node string) []contract.FormField {
	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "target_table", Name: "Target Table", Type: contract.FormFieldTypeSelect, Options: r.tablesList(), Required: true},
		{ID: "ref_columns", Name: "Source Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsList(node), Required: true},
		{ID: "target_columns", Name: "Target Columns", Type: contract.FormFieldTypeMultiSelect, Required: true},
		{ID: "update_action", Name: "On Update", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "NO ACTION", Label: "NO ACTION"},
			{Value: "RESTRICT", Label: "RESTRICT"},
			{Value: "SET NULL", Label: "SET NULL"},
			{Value: "SET DEFAULT", Label: "SET DEFAULT"},
			{Value: "CASCADE", Label: "CASCADE"},
		}},
		{ID: "delete_action", Name: "On Delete", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "NO ACTION", Label: "NO ACTION"},
			{Value: "RESTRICT", Label: "RESTRICT"},
			{Value: "SET NULL", Label: "SET NULL"},
			{Value: "SET DEFAULT", Label: "SET DEFAULT"},
			{Value: "CASCADE", Label: "CASCADE"},
		}},
		{ID: "is_deferrable", Name: "Deferrable", Type: contract.FormFieldTypeCheckBox},
		{ID: "initially_deferred", Name: "Initially Deferred", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *SQLiteRepository) indexOptions(node string) []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsList(node)},
		{ID: "unique", Name: "Unique", Type: contract.FormFieldTypeCheckBox},
		{ID: "order", Name: "Order", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "ASC", Label: "ASC"},
			{Value: "DESC", Label: "DESC"},
		}},
	}
}

func (r *SQLiteRepository) dataTypeOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "INTEGER", Label: "INTEGER"},
		{Value: "INT", Label: "INT"},
		{Value: "BLOB", Label: "BLOB"},
		{Value: "ANY", Label: "ANY"},
		{Value: "TEXT", Label: "TEXT"},
		{Value: "REAL", Label: "REAL"},
	}
}

func (r *SQLiteRepository) columnKindOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "NORMAL", Label: "Normal"},
		{Value: "GENERATED_VIRTUAL", Label: "Generated Virtual"},
		{Value: "GENERATED_STORED", Label: "Generated Stored"},
	}
}

func (r *SQLiteRepository) collectionNameOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "ROLLBACK", Label: "ROLLBACK"},
		{Value: "NOCASE", Label: "NOCASE"},
		{Value: "RTRIM", Label: "RTRIM"},
	}
}

func (r *SQLiteRepository) onNullConflictsOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "ROLLBACK", Label: "ROLLBACK"},
		{Value: "ABORT", Label: "ABORT"},
		{Value: "FAIL", Label: "FAIL"},
		{Value: "IGNORE", Label: "IGNORE"},
		{Value: "REPLACE", Label: "REPLACE"},
	}
}

func (r *SQLiteRepository) tableColumnsList(node string) []contract.FormFieldOption {
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
		return []contract.FormFieldOption{}
	}

	columns := make([]contract.FormFieldOption, len(results))
	for i, result := range results {
		columns[i] = contract.FormFieldOption{
			Value: result.Value,
			Label: result.Name,
		}
	}
	return columns
}

func (r *SQLiteRepository) tablesList() []contract.FormFieldOption {
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
		return []contract.FormFieldOption{}
	}

	tables := make([]contract.FormFieldOption, len(results))
	for i, result := range results {
		tables[i] = contract.FormFieldOption{
			Value: result.Value,
			Label: result.Name,
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

func (r *SQLiteRepository) keyTypeOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "PRIMARY KEY", Label: "PRIMARY KEY"},
		{Value: "UNIQUE", Label: "UNIQUE"},
	}
}
