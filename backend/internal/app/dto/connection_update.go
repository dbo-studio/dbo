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
		Env              *string         `json:"env"`
		SafeModePassword *string         `json:"safeModePassword,omitempty"`
		AgentTier        *string         `json:"agentTier"`
	}

	UpdateConnectionResponse struct {
		Connection
	}
)

func (ccr UpdateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Length(0, 50)),
		validation.Field(&ccr.Env, validation.In("", "dev", "uat", "prod")),
		validation.Field(&ccr.SafeMode, validation.In(
			"silent", "alert", "alert_write", "safe", "safe_write",
			"off", "full", "read_only", "disallow_drop", "",
		)),
		validation.Field(&ccr.AgentTier, validation.In("read_only", "data_write", "schema_change")),
	)
}
