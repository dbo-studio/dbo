package dto

type (
	AiInlineCompleteRequest struct {
		ConnectionId int32             `json:"connectionId"`
		Database     *string           `json:"database,omitempty"`
		Schema       *string           `json:"schema,omitempty"`
		ProviderId   *uint             `json:"providerId,omitempty"`
		Prompt       string            `json:"prompt"`
		Suffix       *string           `json:"suffix,omitempty"`
		Language     *string           `json:"language,omitempty"`
		Model        string            `json:"model"`
		ContextOpts  *AiContextOptions `json:"contextOpts,omitempty"`
	}

	AiInlineCompleteResponse struct {
		Completion string `json:"completion"`
	}
)
