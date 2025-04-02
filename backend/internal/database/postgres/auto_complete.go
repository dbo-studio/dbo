package databasePostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *PostgresRepository) AutoComplete(data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	databases, err := r.getDatabaseList()
	if err != nil {
		return nil, err
	}

	var views []View
	if data.Database != nil && data.Schema != nil {
		views, err = r.getViewList(Database{Name: lo.FromPtr(data.Database)}, Schema{Name: lo.FromPtr(data.Schema)})
	} else {
		views, err = r.getAllViewList()
	}

	if err != nil {
		return nil, err
	}

	schemas, err := r.getAllSchemaList()
	if err != nil {
		return nil, err
	}

	var tables []Table
	if data.Schema != nil {
		tables, err = r.getTableList(Schema{Name: lo.FromPtr(data.Schema)})
	} else {
		tables, err = r.getAllTableList()
	}

	if err != nil {
		return nil, err
	}

	columns := make(map[string][]string)
	if data.Schema != nil {
		for _, table := range tables {
			columnResult, err := r.getColumns(table.Name, lo.FromPtr(data.Schema), nil, false)
			if err != nil {
				return nil, err
			}
			columns[table.Name] = lo.Map(columnResult, func(x Column, _ int) string { return x.ColumnName })
		}
	}

	return &dto.AutoCompleteResponse{
		Databases: lo.Map(databases, func(x Database, _ int) string { return x.Name }),
		Views:     lo.Map(views, func(x View, _ int) string { return x.Name }),
		Schemas:   lo.Map(schemas, func(x Schema, _ int) string { return x.Name }),
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}
