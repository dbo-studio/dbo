package dto

import (
	"github.com/invopop/validation"
)

type (
	AiProviderUpdateRequest struct {
		URL      *string   `json:"url"`
		APIKey   *string   `json:"apiKey"`
		Timeout  *int      `json:"timeout"`
		IsActive *bool     `json:"isActive"`
		Model    *string   `json:"model"`
		Models   *[]string `json:"models"`
	}
)

func (req AiProviderUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.URL, validation.Length(1, 255)),
		validation.Field(&req.APIKey, validation.Length(1, 2048)),
		validation.Field(&req.Timeout, validation.Min(1), validation.Max(1000)),
	)
}
