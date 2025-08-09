package dto

type (
	AIChatRequest struct {
		ConnectionId int32               `json:"connectionId"`
		Database     *string             `json:"database,omitempty"`
		Schema       *string             `json:"schema,omitempty"`
		ThreadId     *uint               `json:"threadId,omitempty"`
		ProfileId    *uint               `json:"profileId,omitempty"`
		Messages     []AIMessage         `json:"messages"`
		Provider     *AIProviderSettings `json:"provider,omitempty"`
		ContextOpts  *AIContextOptions   `json:"contextOpts,omitempty"`
	}

	AIChatResponse struct {
		Message AIMessage `json:"message"`
	}
)

type (
	AIProviderSettings struct {
		ProviderId  string   `json:"providerId"`
		BaseUrl     *string  `json:"baseUrl,omitempty"`
		ApiKey      *string  `json:"apiKey,omitempty"`
		Model       string   `json:"model"`
		Temperature *float32 `json:"temperature,omitempty"`
		MaxTokens   *int     `json:"maxTokens,omitempty"`
	}

	AIContextOptions struct {
		IncludeDDL     bool `json:"includeDDL"`
		IncludeTables  bool `json:"includeTables"`
		IncludeColumns bool `json:"includeColumns"`
	}

	AIMessage struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
)
