package databaseCore

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (*BaseRepository) BuildObjectFormResponseFromResults(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	var data []map[string]any
	if len(results) > 0 {
		data = []map[string]any{results[0]}
	} else {
		data = []map[string]any{{}}
	}

	return &contract.FormResponse{
		Schema: fields,
		Data:   data,
	}, nil
}

func (*BaseRepository) BuildFormResponseFromResults(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	if len(results) == 0 {
		return &contract.FormResponse{
			Schema: fields,
			Data:   []map[string]any{},
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
		Schema: fields,
		Data:   data,
	}, nil
}

func (*BaseRepository) SampleBuildFormResponseFromResults(general []contract.GeneralField, results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	if len(results) == 0 {
		return &contract.FormResponse{
			General: general,
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
		General: general,
		Schema:  fields,
		Data:    data,
	}, nil
}

func (*BaseRepository) BuildGeneralFormResult(results map[string]any, fields []contract.FormField) ([]contract.GeneralField, error) {
	return buildGeneralFormFieldsFromSchema(fields, results), nil
}

func (*BaseRepository) BuildGeneralFormFieldsFromSchema(fields []contract.FormField, results map[string]any) ([]contract.GeneralField, error) {
	return buildGeneralFormFieldsFromSchema(fields, results), nil
}

func buildGeneralFormFieldsFromSchema(fields []contract.FormField, results map[string]any) []contract.GeneralField {
	generalFields := make([]contract.GeneralField, 0, len(fields))

	for _, f := range fields {
		val, exists := results[f.ID]
		if !exists {
			val = nil
		}

		generalFields = append(generalFields, contract.GeneralField{
			ID:       f.ID,
			Name:     f.Name,
			Type:     f.Type,
			Required: f.Required,
			Value:    val,
			Options:  f.Options,
		})
	}

	return generalFields
}
