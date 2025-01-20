package dto

import (
	"github.com/invopop/validation"
)

type (
	GetDesignColumnRequest struct {
		ConnectionId int32  `query:"connection_id"`
		Table        string `query:"table"`
		Schema       string `query:"schema"`
	}

	GetDesignColumnResponse struct {
		Columns []GetDesignColumn
	}
)

type (
	GetDesignColumn struct {
		Name       string  `json:"name"`
		Type       string  `json:"type"`
		NotNull    bool    `json:"not_null"`
		Length     *int32  `json:"length"`
		Default    *string `json:"default"`
		Comment    *string `json:"comment"`
		MappedType string  `json:"mapped_type"`
		Editable   bool    `json:"editable"`
		IsActive   bool    `json:"is_active"`
	}
)

func (gdc GetDesignColumnRequest) Validate() error {
	return validation.ValidateStruct(&gdc,
		validation.Field(&gdc.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&gdc.Table, validation.Required, validation.Length(0, 120)),
		validation.Field(&gdc.Schema, validation.Required, validation.Length(0, 120)),
	)
}
