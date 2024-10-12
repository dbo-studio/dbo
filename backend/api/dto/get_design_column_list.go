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
		OrdinalPosition        int32   `json:"ordinal_position"`
		ColumnName             string  `json:"column_name"`
		DataType               string  `json:"data_type"`
		IsNullable             string  `json:"is_nullable"`
		ColumnDefault          *string `json:"column_default"`
		CharacterMaximumLength *int32  `json:"character_maximum_length"`
		Comment                *string `json:"column_comment"`
		MappedType             string  `json:"mapped_type"`
		Editable               bool    `json:"editable"`
		IsActive               bool    `json:"is_active"`
	}
)

func (gdc GetDesignColumnRequest) Validate() error {
	return validation.ValidateStruct(&gdc,
		validation.Field(&gdc.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&gdc.Table, validation.Required, validation.Length(0, 120)),
		validation.Field(&gdc.Schema, validation.Required, validation.Length(0, 120)),
	)
}
