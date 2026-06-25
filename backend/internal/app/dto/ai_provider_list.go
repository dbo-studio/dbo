package dto

type (
	AiProviderListResponse struct {
		Items []AiProvider
	}
)

type (
	AiProvider struct {
		ID         uint     `json:"id"`
		Type       string   `json:"type"`
		APIKey     *string  `json:"apiKey"`
		URL        string   `json:"url"`
		Timeout    int      `json:"timeout"`
		Models     []string `json:"models"`
		IsActive   bool     `json:"isActive"`
		Model      string   `json:"model"`
		LastUsedAt string   `json:"lastUsedAt"`
	}
)
