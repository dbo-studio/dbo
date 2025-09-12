package dto

import (
	"github.com/invopop/validation"
)

type (
	AiProviderUpdateRequest struct {
		Url      *string   `json:"url"`
		ApiKey   *string   `json:"apiKey"`
		Timeout  *int      `json:"timeout"`
		IsActive *bool     `json:"isActive"`
		Model    *string   `json:"model"`
		Models   *[]string `json:"models"`
	}
)

func (req AiProviderUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Url, validation.Length(1, 255)),
		validation.Field(&req.ApiKey, validation.Length(1, 2048)),
		validation.Field(&req.Timeout, validation.Min(1), validation.Max(1000)),
	)
}
