package databaseMysql

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *MySQLRepository) tableFields(_ context.Context, _ contract.TreeNodeActionName) []contract.FormField {
	return []contract.FormField{
		{ID: "relname", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "description", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "ENGINE", Name: "Engine", Type: contract.FormFieldTypeSelect, Options: r.engineOptions()},
		{ID: "ROW_FORMAT", Name: "Row Format", Type: contract.FormFieldTypeSelect, Options: r.rowFormatOptions()},
	}
}

func (r *MySQLRepository) tableColumnFields() []contract.FormField {
	return []contract.FormField{
		{ID: "column_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "data_type", Name: "Data Type", Type: contract.FormFieldTypeSelect, Options: r.dataTypeOptions(), Required: true},
		{ID: "not_null", Name: "Not Null", Type: contract.FormFieldTypeCheckBox},
		{ID: "column_default", Name: "Default", Type: contract.FormFieldTypeText},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "character_maximum_length", Name: "Max length", Type: contract.FormFieldTypeText},
		{ID: "numeric_scale", Name: "Numeric scale", Type: contract.FormFieldTypeText},
		{ID: "is_identity", Name: "Auto Increment", Type: contract.FormFieldTypeCheckBox},
	}
}

func (r *MySQLRepository) foreignKeyFields(ctx context.Context, nodeID string) []contract.FormField {
	node := r.base.ExtractNode(nodeID)
	return []contract.FormField{
		{ID: "constraint_name", Name: "Constraint Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "target_table", Name: "Target Table", Type: contract.FormFieldTypeSelect, Options: r.tablesListOptions(ctx, node.Database), Required: true},
		{ID: "ref_columns", Name: "Source Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsOptions(ctx, node.Database, node.Table), Required: true},
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
	}
}

func (r *MySQLRepository) keyFields(ctx context.Context, nodeID string) []contract.FormField {
	node := r.base.ExtractNode(nodeID)
	return []contract.FormField{
		{ID: "constraint_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "ref_columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsOptions(ctx, node.Database, node.Table), Required: true},
		{ID: "constraint_type", Name: "Type", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "PRIMARY KEY", Label: "PRIMARY KEY"},
			{Value: "UNIQUE", Label: "UNIQUE"},
		}, Required: true},
	}
}

func (r *MySQLRepository) indexOptions(ctx context.Context, nodeID string) []contract.FormField {
	node := r.base.ExtractNode(nodeID)
	return []contract.FormField{
		{ID: "index_name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "ref_columns", Name: "Columns", Type: contract.FormFieldTypeMultiSelect, Options: r.tableColumnsOptions(ctx, node.Database, node.Table), Required: true},
		{ID: "non_unique", Name: "Unique", Type: contract.FormFieldTypeCheckBox},
		{ID: "collation", Name: "Collation", Type: contract.FormFieldTypeSelect, Options: []contract.FormFieldOption{
			{Value: "A", Label: "ASC"},
			{Value: "D", Label: "DESC"},
		}},
	}
}

func (r *MySQLRepository) viewFields() []contract.FormField {
	return []contract.FormField{
		{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
		{ID: "comment", Name: "Comment", Type: contract.FormFieldTypeText},
		{ID: "query", Name: "Query", Type: contract.FormFieldTypeQuery, Required: true},
	}
}

func (r *MySQLRepository) engineOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "InnoDB", Label: "InnoDB"},
		{Value: "MyISAM", Label: "MyISAM"},
		{Value: "MEMORY", Label: "MEMORY"},
		{Value: "CSV", Label: "CSV"},
		{Value: "ARCHIVE", Label: "ARCHIVE"},
		{Value: "BLACKHOLE", Label: "BLACKHOLE"},
		{Value: "FEDERATED", Label: "FEDERATED"},
		{Value: "MERGE", Label: "MERGE"},
		{Value: "NDBCLUSTER", Label: "NDBCLUSTER"},
	}
}

func (r *MySQLRepository) rowFormatOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "DEFAULT", Label: "DEFAULT"},
		{Value: "DYNAMIC", Label: "DYNAMIC"},
		{Value: "FIXED", Label: "FIXED"},
		{Value: "COMPRESSED", Label: "COMPRESSED"},
		{Value: "REDUNDANT", Label: "REDUNDANT"},
		{Value: "COMPACT", Label: "COMPACT"},
	}
}

func (r *MySQLRepository) dataTypeOptions() []contract.FormFieldOption {
	return []contract.FormFieldOption{
		{Value: "TINYINT", Label: "TINYINT"},
		{Value: "SMALLINT", Label: "SMALLINT"},
		{Value: "MEDIUMINT", Label: "MEDIUMINT"},
		{Value: "INT", Label: "INT"},
		{Value: "INTEGER", Label: "INTEGER"},
		{Value: "BIGINT", Label: "BIGINT"},
		{Value: "FLOAT", Label: "FLOAT"},
		{Value: "DOUBLE", Label: "DOUBLE"},
		{Value: "DECIMAL", Label: "DECIMAL"},
		{Value: "NUMERIC", Label: "NUMERIC"},
		{Value: "BIT", Label: "BIT"},
		{Value: "CHAR", Label: "CHAR"},
		{Value: "VARCHAR", Label: "VARCHAR"},
		{Value: "BINARY", Label: "BINARY"},
		{Value: "VARBINARY", Label: "VARBINARY"},
		{Value: "TINYBLOB", Label: "TINYBLOB"},
		{Value: "BLOB", Label: "BLOB"},
		{Value: "MEDIUMBLOB", Label: "MEDIUMBLOB"},
		{Value: "LONGBLOB", Label: "LONGBLOB"},
		{Value: "TINYTEXT", Label: "TINYTEXT"},
		{Value: "TEXT", Label: "TEXT"},
		{Value: "MEDIUMTEXT", Label: "MEDIUMTEXT"},
		{Value: "LONGTEXT", Label: "LONGTEXT"},
		{Value: "ENUM", Label: "ENUM"},
		{Value: "SET", Label: "SET"},
		{Value: "DATE", Label: "DATE"},
		{Value: "TIME", Label: "TIME"},
		{Value: "DATETIME", Label: "DATETIME"},
		{Value: "TIMESTAMP", Label: "TIMESTAMP"},
		{Value: "YEAR", Label: "YEAR"},
		{Value: "JSON", Label: "JSON"},
		{Value: "GEOMETRY", Label: "GEOMETRY"},
		{Value: "POINT", Label: "POINT"},
		{Value: "LINESTRING", Label: "LINESTRING"},
		{Value: "POLYGON", Label: "POLYGON"},
		{Value: "MULTIPOINT", Label: "MULTIPOINT"},
		{Value: "MULTILINESTRING", Label: "MULTILINESTRING"},
		{Value: "MULTIPOLYGON", Label: "MULTIPOLYGON"},
		{Value: "GEOMETRYCOLLECTION", Label: "GEOMETRYCOLLECTION"},
	}
}

func (r *MySQLRepository) tablesListOptions(ctx context.Context, database string) []contract.FormFieldOption {
	tables, err := r.tables(ctx, &database, true)
	if err != nil {
		return []contract.FormFieldOption{}
	}

	options := make([]contract.FormFieldOption, len(tables))
	for i, table := range tables {
		options[i] = contract.FormFieldOption{
			Value: table.Name,
			Label: table.Name,
		}
	}
	return options
}

func (r *MySQLRepository) tableColumnsOptions(ctx context.Context, database, table string) []contract.FormFieldOption {
	columns, err := r.columns(ctx, &database, &table, []string{}, false, true)
	if err != nil {
		return []contract.FormFieldOption{}
	}

	options := make([]contract.FormFieldOption, len(columns))
	for i, column := range columns {
		options[i] = contract.FormFieldOption{
			Value: column.ColumnName,
			Label: column.ColumnName,
		}
	}
	return options
}
