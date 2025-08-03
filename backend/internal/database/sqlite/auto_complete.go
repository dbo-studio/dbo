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

}
