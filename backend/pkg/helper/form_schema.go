package helper

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func BuildObjectFormResponseFromResults(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	var data []map[string]any
	if len(results) > 0 {
		data = []map[string]any{results[0]}
	} else {
		data = []map[string]any{{}}
	}

	return &contract.FormResponse{
		IsArray: false,
		Schema:  fields,
		Data:    data,
	}, nil
}

func BuildFormResponseFromResults(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	if len(results) == 0 {
		return &contract.FormResponse{
			IsArray: true,
			Schema:  fields,
			Data:    []map[string]any{},
		}, nil
	}

	data := make([]map[string]any, len(results))
	for i, result := range results {
		rowData := make(map[string]any)
		for _, field := range fields {
			if val, exists := result[field.ID]; exists {
				rowData[field.ID] = val
			}
		}
		data[i] = rowData
	}

	return &contract.FormResponse{
		IsArray: true,
		Schema:  fields,
		Data:    data,
	}, nil
}
