package dto

type (
	AIProviderListResponse struct {
		Items []AIProvider
	}
)

type (
	AIProvider struct {
		ID          uint     `json:"id"`
		Name        string   `json:"name"`
		Type        string   `json:"type"`
		Url         string   `json:"url"`
		ApiKey      string   `json:"apiKey"`
		Model       string   `json:"model"`
		Temperature *float32 `json:"temperature"`
		MaxTokens   *int     `json:"maxTokens"`
	}
)
