package dto

type (
	AiChatRequest struct {
		ConnectionId int32             `json:"connectionId"`
		Database     *string           `json:"database,omitempty"`
		Schema       *string           `json:"schema,omitempty"`
		ChatId       *uint             `json:"chatId,omitempty"`
		ProviderId   *uint             `json:"providerId,omitempty"`
		Model        string            `json:"model"`
		Messages     []AiMessage       `json:"messages"`
		ContextOpts  *AiContextOptions `json:"contextOpts,omitempty"`
	}

	AiChatResponse struct {
		ChatId  uint      `json:"chatId"`
		Message AiMessage `json:"message"`
	}
)

type (
	AiContextOptions struct {
		IncludeDDL     bool `json:"includeDDL"`
		IncludeTables  bool `json:"includeTables"`
		IncludeColumns bool `json:"includeColumns"`
	}

	AiMessage struct {
		Role      string `json:"role"`
		Content   string `json:"content"`
		CreatedAt string `json:"createdAt"`
	}
)
