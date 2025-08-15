package dto

type (
	AiInlineCompleteRequest struct {
		ConnectionId int32             `json:"connectionId"`
		Database     *string           `json:"database"`
		Schema       *string           `json:"schema"`
		Prompt       string            `json:"prompt"`
		Suffix       *string           `json:"suffix"`
		Language     *string           `json:"language"`
		Model        string            `json:"model"`
		ContextOpts  *AiContextOptions `json:"contextOpts"`
	}

	AiInlineCompleteResponse struct {
		Completion string `json:"completion"`
	}
)
