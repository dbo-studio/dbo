package dto

import "github.com/invopop/validation"

type (
	AiChatRequest struct {
		ConnectionID int32             `json:"connectionId"`
		Message      string            `json:"message"`
		ChatID       *int32            `json:"chatId"`
		ContextOpts  *AiContextOptions `json:"contextOpts"`
	}

	AiChatResponse struct {
		ChatID   uint        `json:"chatId"`
		Title    string      `json:"title"`
		Messages []AiMessage `json:"messages"`
	}
)

type (
	AiContextOptions struct {
		Query              *string  `json:"query"`
		SelectedQuery      *string  `json:"selectedQuery"`
		Database           *string  `json:"database"`
		Schema             *string  `json:"schema"`
		Tables             []string `json:"tables"`
		Views              []string `json:"views"`
		QueryResultSummary *string  `json:"queryResultSummary"`
		ObjectDefinition   *string  `json:"objectDefinition"`
	}

	AiMessage struct {
		Role      string `json:"role"`
		Content   string `json:"content"`
		Type      string `json:"type"`
		Language  string `json:"language"`
		CreatedAt string `json:"createdAt"`
	}
)

func (req AiChatRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Message, validation.Required, validation.Length(0, 10000)),
		validation.Field(&req.ChatID, validation.Min(0)),
	)
}
