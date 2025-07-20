package databaseSqlite

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
)

func (r *SQLiteRepository) AutoComplete(req *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	// For SQLite, we can provide basic autocomplete for table and column names
	response := &dto.AutoCompleteResponse{
		Databases: []string{},
		Views:     []string{},
		Schemas:   []string{},
		Tables:    []string{},
		Columns:   make(map[string][]string),
	}

	// Get table names for autocomplete
	tables, err := r.getAllTableList()
	if err != nil {
		return nil, err
	}

	for _, table := range tables {
		response.Tables = append(response.Tables, table.Name)
	}

	// Get view names for autocomplete
	views, err := r.getAllViewList()
	if err != nil {
		return nil, err
	}

	for _, view := range views {
		response.Views = append(response.Views, view.Name)
	}

	// Get columns for each table
	for _, table := range tables {
		columns, err := r.getColumns(table.Name, nil, false)
		if err != nil {
			continue
		}

		columnNames := make([]string, 0)
		for _, column := range columns {
			columnNames = append(columnNames, column.ColumnName)
		}
		response.Columns[table.Name] = columnNames
	}

	return response, nil
}
