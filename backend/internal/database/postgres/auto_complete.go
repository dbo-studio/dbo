package databasePostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *PostgresRepository) AutoComplete(data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	databases, err := r.databases(true)
	if err != nil {
		return nil, err
	}

	var views []View
	if data.Database != nil && data.Schema != nil {
		views, err = r.views(data.Database, data.Schema, true)
	} else {
		views, err = r.views(nil, nil, true)
	}

	if err != nil {
		return nil, err
	}

	schemas, err := r.schemas(data.Database, true)
	if err != nil {
		return nil, err
	}

	var tables []Table
	if data.Schema != nil {
		tables, err = r.tables(data.Schema, true)
	} else {
		tables, err = r.tables(nil, true)
	}

	if err != nil {
		return nil, err
	}

	columns := make(map[string][]string)
	if data.Schema != nil {
		for _, table := range tables {
			columnResult, err := r.columns(&table.Name, data.Schema, nil, false, true)
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
