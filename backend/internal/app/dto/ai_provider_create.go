package dto

import "github.com/invopop/validation"

type (
	AIProviderCreateRequest struct {
		Name        string  `json:"name"`
		Type        string  `json:"type"`
		Url         string  `json:"url"`
		ApiKey      string  `json:"apiKey"`
		Model       string  `json:"model"`
		Temperature float32 `json:"temperature"`
		MaxTokens   int     `json:"maxTokens"`
	}
)

func (req AIProviderCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Name, validation.Required, validation.Length(1, 100)),
		validation.Field(&req.Type, validation.Required, validation.In("openai")),
		validation.Field(&req.Url, validation.Required, validation.Length(1, 255)),
		validation.Field(&req.ApiKey, validation.Required, validation.Length(1, 2048)),
		validation.Field(&req.Model, validation.Required, validation.Length(1, 128)),
		validation.Field(&req.Temperature, validation.Required, validation.Min(0.0), validation.Max(1.0)),
		validation.Field(&req.MaxTokens, validation.Required, validation.Min(1), validation.Max(10000)),
	)
}
