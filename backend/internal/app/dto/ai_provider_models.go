package dto

import "github.com/invopop/validation"

type (
	// AiProviderModelsRequest carries the values being edited, so a provider can
	// be tested before it is saved. A missing field means "use the saved one".
	AiProviderModelsRequest struct {
		URL     *string `json:"url"`
		APIKey  *string `json:"apiKey"`
		Timeout *int    `json:"timeout"`
	}

	// AiProviderModelsResponse is the model list, or why it could not be read.
	AiProviderModelsResponse struct {
		Models []string `json:"models"`
		Error  string   `json:"error,omitempty"`
	}
)

func (req AiProviderModelsRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.URL, validation.Length(1, 255)),
		validation.Field(&req.Timeout, validation.Min(1), validation.Max(1000)),
	)
}
