package dto

type (
	AiProviderListResponse struct {
		Items []AiProvider
	}
)

type (
	AiProvider struct {
		ID          uint     `json:"id"`
		Type        string   `json:"type"`
		ApiKey      *string   `json:"apiKey"`
		Url         *string  `json:"url"`
		Models      []string  `json:"models"`
		Temperature *float32 `json:"temperature"`
		MaxTokens   *int     `json:"maxTokens"`
	}
)
