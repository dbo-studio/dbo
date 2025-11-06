package dto

import "github.com/invopop/validation"

type (
	AiChatRequest struct {
		ConnectionId int32             `json:"connectionId"`
		Message      string            `json:"message"`
		ChatId       *int32            `json:"chatId"`
		ContextOpts  *AiContextOptions `json:"contextOpts"`
	}

	AiChatResponse struct {
		ChatId   uint        `json:"chatId"`
		Title    string      `json:"title"`
		Messages []AiMessage `json:"messages"`
	}
)

type (
	AiContextOptions struct {
		Query          *string  `json:"query"`
		Database       *string  `json:"database"`
		Schema         *string  `json:"schema"`
		Tables         []string `json:"tables"`
		Views          []string `json:"views"`
		SchemaDiagram  *bool    `json:"schemaDiagram"` // If true, include full schema diagram structure
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
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Message, validation.Required, validation.Length(0, 500)),
		validation.Field(&req.ChatId, validation.Min(0)),
	)
}
