package databasePostgres

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type PGNode struct {
	Database string
	Schema   string
	Table    string
}

func extractNode(node string) PGNode {
	parts := strings.Split(node, ".")

	var database, schema, table string

	switch len(parts) {
	case 1:
		database = parts[0]
	case 2:
		database, schema = parts[0], parts[1]
	case 3:
		database, schema, table = parts[0], parts[1], parts[2]
	}

	return PGNode{
		Database: database,
		Schema:   schema,
		Table:    table,
	}
}

func isQuery(query string) bool {
	return strings.Contains(strings.ToLower(query), "select")
}

func columnMappedFormat(dataType string) string {
	switch dataType {
	case "VARCHAR", "TEXT", "UUID", "TIMESTAMP", "VARBIT":
		return "string"
	case "BOOL":
		return "boolean"
	case "INT", "INTEGER", "BIT", "FLOAT":
		return "number"
	default:
		return "string"
	}
}

func columnListToResponse(columns []Column) []dto.Column {
	data := make([]dto.Column, 0)
	for _, column := range columns {
		var col dto.Column

		col.Name = column.ColumnName
		col.Type = column.DataType
		col.MappedType = column.MappedType
		col.Editable = column.Editable
		col.IsActive = column.IsActive

		if column.IsNullable == "NO" {
			col.NotNull = false
		}

		if column.CharacterMaximumLength.Valid {
			col.Length = lo.ToPtr[int32](column.CharacterMaximumLength.Int32)
		}

		if column.ColumnDefault.Valid {
			col.Default = lo.ToPtr[string](column.ColumnDefault.String)
		}

		if column.Comment.Valid {
			col.Comment = lo.ToPtr[string](column.Comment.String)
		}

		data = append(data, col)
	}

	return data
}

func buildFieldArray(fields []contract.FormField) []contract.FormField {
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

func buildObjectResponse(query *gorm.DB, fields []contract.FormField) ([]contract.FormField, error) {
	var results []map[string]any
	err := query.Scan(&results).Error
	if err != nil {
		return nil, err
	}

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

func buildArrayResponse(query *gorm.DB, fields []contract.FormField) ([]contract.FormField, error) {
	var results []map[string]any
	err := query.Scan(&results).Error
	if err != nil {
		return nil, err
	}

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

func convertToDTO[T any](params []byte) (T, error) {
	var dtoParams T
	err := json.Unmarshal(params, &dtoParams)
	if err != nil {
		return dtoParams, fmt.Errorf("failed to unmarshal params: %v", err)
	}

	return dtoParams, nil
}
