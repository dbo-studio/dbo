package dto

import "github.com/invopop/validation"

type (
	AiProviderCreateRequest struct {
		Type        string   `json:"type"`
		ApiKey      string   `json:"apiKey"`
		Url         *string  `json:"url"`
		Model       *string  `json:"model"`
		Temperature *float32 `json:"temperature"`
		MaxTokens   *int     `json:"maxTokens"`
	}
)

func (req AiProviderCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Type, validation.Required, validation.In("openai")),
		validation.Field(&req.ApiKey, validation.Required, validation.Length(1, 2048)),
		validation.Field(&req.Url, validation.Length(1, 255)),
		validation.Field(&req.Model, validation.Length(1, 128)),
		validation.Field(&req.Temperature, validation.Min(0.0), validation.Max(1.0)),
		validation.Field(&req.MaxTokens, validation.Min(1), validation.Max(10000)),
	)
}
