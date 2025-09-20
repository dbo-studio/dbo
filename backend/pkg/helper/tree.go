package helper

import (
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"

	"github.com/goccy/go-json"
	"gorm.io/gorm"
)

func BuildFieldArray(fields []contract.FormField) []contract.FormField {
	return []contract.FormField{
		{
			ID:   "columns",
			Type: "array",
			Fields: []contract.FormField{
				{
					ID:     "empty",
					Type:   "object",
					Fields: fields,
				},
			},
		},
	}
}

func BuildObjectResponse(query *gorm.DB, fields []contract.FormField) ([]contract.FormField, error) {
	var results []map[string]any
	err := query.Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return BuildObjectResponseFromResult(results, fields)
}

func BuildObjectResponseFromResult(results []map[string]any, fields []contract.FormField) ([]contract.FormField, error) {
	if len(results) == 0 {
		return fields, nil
	}

	for i, field := range fields {
		if val, exists := results[0][field.ID]; exists && val != nil {
			fields[i].Value = val
		}
	}

	return fields, nil
}

func BuildArrayResponse(query *gorm.DB, fields []contract.FormField) ([]contract.FormField, error) {
	var results []map[string]any
	err := query.Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return BuildArrayResponseFromResult(results, fields)
}

func BuildArrayResponseFromResult(results []map[string]any, fields []contract.FormField) ([]contract.FormField, error) {
	if len(results) == 0 {
		return []contract.FormField{
			{
				ID:   "columns",
				Type: "array",
				Fields: []contract.FormField{
					{
						ID:     "empty",
						Type:   "object",
						Fields: fields,
					},
				},
			},
		}, nil
	}

	responseFields := make([]contract.FormField, len(results))
	responseFields = append(responseFields, contract.FormField{
		ID:     "empty",
		Type:   "object",
		Fields: fields,
	})

	for i, result := range results {
		responseFields[i] = contract.FormField{
			ID:     "",
			Type:   "object",
			Fields: make([]contract.FormField, len(fields)),
		}

		for j, field := range fields {
			newField := field
			if val, exists := result[field.ID]; exists && val != nil {
				newField.Value = val
			}
			responseFields[i].Fields[j] = newField
		}
	}

	return []contract.FormField{
		{
			ID:     "columns",
			Type:   "array",
			Fields: responseFields,
		},
	}, nil
}

func ConvertToDTO[T any](params []byte) (T, error) {
	var dtoParams T
	err := json.Unmarshal(params, &dtoParams)
	if err != nil {
		return dtoParams, fmt.Errorf("failed to unmarshal params: %v", err)
	}

	return dtoParams, nil
}

func CommandResponseBuilder(queryResult *dto.RawQueryResponse, endTime time.Duration, err error) *dto.RawQueryResponse {
	message := "OK"
	if err != nil {
		message = err.Error()
	}

	newStructures := []dto.Column{
		{
			Name:       "Query",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
		{
			Name:       "Message",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
		{
			Name:       "Duration",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
	}

	return &dto.RawQueryResponse{
		Query: queryResult.Query,
		Data: []map[string]any{
			{
				"Query":    queryResult.Query,
				"Message":  message,
				"Duration": FloatToString(endTime.Seconds()),
			},
		},
		Columns: newStructures,
	}
}

func IsQuery(query string) bool {
	return strings.Contains(strings.ToLower(query), "select")
}
