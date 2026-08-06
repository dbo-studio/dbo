package dto

import (
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
)

type (
	PingConnectionRequest struct {
		ID      *int32          `json:"id"`
		Type    string          `json:"type"`
		Options json.RawMessage `json:"options"`
	}

	PingConnectionResponse struct {
		LatencyMs     int64   `json:"latencyMs"`
		ServerVersion string  `json:"serverVersion,omitempty"`
		SSLNegotiated *bool   `json:"sslNegotiated,omitempty"`
		SSLMode       *string `json:"sslMode,omitempty"`
	}
)

func (ccr PingConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Type, validation.Required, validation.In("postgresql", "mysql", "sqlite", "sqlserver")),
	)
}
