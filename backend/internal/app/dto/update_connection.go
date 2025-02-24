package dto

import (
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
)

type (
	UpdateConnectionRequest struct {
		Name     *string         `json:"name"`
		IsActive *bool           `json:"is_active"`
		Options  json.RawMessage `json:"options"`
	}
)

func (ccr UpdateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Length(0, 50)),
	)
}
