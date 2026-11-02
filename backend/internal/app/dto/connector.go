package dto

import (
	"github.com/invopop/validation"
)

type (
	// ConnectorRequest creates or updates a destination or channel. Secrets is
	// write-only: a key left empty keeps the saved value.
	ConnectorRequest struct {
		ID      uint              `json:"-"`
		Type    string            `json:"type"`
		Name    string            `json:"name"`
		Enabled *bool             `json:"enabled"`
		Config  map[string]any    `json:"config"`
		Secrets map[string]string `json:"secrets"`
	}

	// ConnectorResponse never carries secret values, only which ones are set.
	ConnectorResponse struct {
		ID         uint            `json:"id"`
		Kind       string          `json:"kind"`
		Type       string          `json:"type"`
		Name       string          `json:"name"`
		Enabled    bool            `json:"enabled"`
		Config     map[string]any  `json:"config"`
		SecretsSet map[string]bool `json:"secretsSet"`
	}

	ConnectorAuthURLResponse struct {
		URL string `json:"url"`
	}
)

func (req ConnectorRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Type, validation.Required),
		validation.Field(&req.Name, validation.Required, validation.Length(1, 100)),
	)
}
