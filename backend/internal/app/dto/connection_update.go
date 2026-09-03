package dto

import (
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
)

type (
	UpdateConnectionRequest struct {
		Name             *string         `json:"name"`
		IsActive         *bool           `json:"isActive"`
		IsClose          *bool           `json:"isClose"`
		RememberPassword *bool           `json:"rememberPassword,omitempty"`
		Options          json.RawMessage `json:"options"`
		SafeMode         *string         `json:"safeMode"`
		SafeModePassword *string         `json:"safeModePassword,omitempty"`
	}

	UpdateConnectionResponse struct {
		Connection
	}
)

func (ccr UpdateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Length(0, 50)),
		validation.Field(&ccr.SafeMode, validation.In(
			"silent", "alert", "alert_write", "safe", "safe_write",
			"off", "full", "read_only", "disallow_drop", "",
		)),
	)
}
