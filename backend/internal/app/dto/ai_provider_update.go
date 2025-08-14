package dto

import "github.com/invopop/validation"

type (
	AiProviderUpdateRequest struct {
		Url         *string  `json:"url"`
		ApiKey      *string  `json:"apiKey"`
		Temperature *float32 `json:"temperature"`
		MaxTokens   *int     `json:"maxTokens"`
	}
)

func (req AiProviderUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Url, validation.Length(1, 255)),
		validation.Field(&req.ApiKey, validation.Length(1, 2048)),
		validation.Field(&req.Temperature, validation.Min(0.0), validation.Max(1.0)),
		validation.Field(&req.MaxTokens, validation.Min(1), validation.Max(10000)),
	)
}
	