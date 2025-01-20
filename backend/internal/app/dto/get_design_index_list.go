package dto

import (
	"github.com/invopop/validation"
)

type (
	GetDesignIndexRequest struct {
		ConnectionId int32  `query:"connection_id"`
		Table        string `query:"table"`
		Schema       string `query:"schema"`
	}

	GetDesignIndexResponse struct {
		Indices []GetDesignIndex
	}
)

type (
	GetDesignIndex struct {
		IndexName       string  `json:"index_name"`
		IndexAlgorithm  string  `json:"index_algorithm"`
		IsUnique        bool    `json:"is_unique"`
		IndexDefinition string  `json:"index_definition"`
		ColumnName      string  `json:"column_name"`
		Condition       string  `json:"condition"`
		Comment         *string `json:"comment"`
	}
)

func (gdc GetDesignIndexRequest) Validate() error {
	return validation.ValidateStruct(&gdc,
		validation.Field(&gdc.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&gdc.Table, validation.Required, validation.Length(0, 120)),
		validation.Field(&gdc.Schema, validation.Required, validation.Length(0, 120)),
	)
}
