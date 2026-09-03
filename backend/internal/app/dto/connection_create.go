package dto

import (
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
)

type (
	CreateConnectionRequest struct {
		Name             string          `json:"name"`
		Type             string          `json:"type"`
		Options          json.RawMessage `json:"options"`
		RememberPassword *bool           `json:"rememberPassword"`
		SafeMode         *string         `json:"safeMode"`
	}
)

func (ccr CreateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Required, validation.Length(0, 50)),
		validation.Field(&ccr.Type, validation.Required, validation.In("postgresql", "mysql", "sqlite", "sqlserver")),
		validation.Field(&ccr.SafeMode, validation.In(
			"silent", "alert", "alert_write", "safe", "safe_write",
			"off", "full", "read_only", "disallow_drop", "",
		)),
	)
}
