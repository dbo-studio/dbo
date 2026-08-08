package databaseCore

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (*BaseRepository) BuildGeneralFormResponse(fields []contract.FormField, result map[string]any) (*contract.FormResponse, error) {
	if result == nil {
		result = map[string]any{}
	}

	return &contract.FormResponse{
		General: buildGeneralFormFieldsFromSchema(fields, result),
		Schema:  []contract.FormField{},
		Data:    []map[string]any{},
	}, nil
}

func (*BaseRepository) BuildArrayFormResponse(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	if len(results) == 0 {
		return &contract.FormResponse{
			General: []contract.GeneralField{},
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
		General: []contract.GeneralField{},
		Schema:  fields,
		Data:    data,
	}, nil
}

func (*BaseRepository) BuildHybridFormResponse(general []contract.GeneralField, results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	arrayResponse, err := (*BaseRepository)(nil).BuildArrayFormResponse(results, fields)
	if err != nil {
		return nil, err
	}

	arrayResponse.General = general

	return arrayResponse, nil
}

// Deprecated: use BuildGeneralFormResponse instead.
func (b *BaseRepository) BuildObjectFormResponseFromResults(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	result := map[string]any{}
	if len(results) > 0 {
		result = results[0]
	}

	return b.BuildGeneralFormResponse(fields, result)
}

// Deprecated: use BuildArrayFormResponse instead.
func (b *BaseRepository) BuildFormResponseFromResults(results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	return b.BuildArrayFormResponse(results, fields)
}

// Deprecated: use BuildHybridFormResponse instead.
func (b *BaseRepository) SampleBuildFormResponseFromResults(general []contract.GeneralField, results []map[string]any, fields []contract.FormField) (*contract.FormResponse, error) {
	return b.BuildHybridFormResponse(general, results, fields)
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
