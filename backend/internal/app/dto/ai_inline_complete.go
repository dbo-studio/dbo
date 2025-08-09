package dto

type (
	AIInlineCompleteRequest struct {
		ConnectionId int32               `json:"connectionId"`
		Database     *string             `json:"database,omitempty"`
		Schema       *string             `json:"schema,omitempty"`
		Prompt       string              `json:"prompt"`
		Suffix       *string             `json:"suffix,omitempty"`
		Language     *string             `json:"language,omitempty"`
		Provider     *AIProviderSettings `json:"provider,omitempty"`
		ContextOpts  *AIContextOptions   `json:"contextOpts,omitempty"`
	}

	AIInlineCompleteResponse struct {
		Completion string `json:"completion"`
	}
)
