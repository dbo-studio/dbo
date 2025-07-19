package dto

import (
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
)

type (
	CreateConnectionRequest struct {
		Name    string          `json:"name"`
		Type    string          `json:"type"`
		Options json.RawMessage `json:"options"`
	}
)

func (ccr CreateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Required, validation.Length(0, 50)),
		validation.Field(&ccr.Type, validation.Required, validation.In("postgresql", "mysql", "sqlite", "sqlserver")),
	)
}
