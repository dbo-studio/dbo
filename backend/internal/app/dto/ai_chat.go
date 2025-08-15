package dto

import "github.com/invopop/validation"

type (
	AiChatRequest struct {
		ConnectionId int32             `json:"connectionId"`
		ProviderId   int32             `json:"providerId"`
		Model        string            `json:"model"`
		Message      string            `json:"message"`
		ChatId       *int32            `json:"chatId"`
		ContextOpts  *AiContextOptions `json:"contextOpts"`
	}

	AiChatResponse struct {
		ChatId  uint      `json:"chatId"`
		Message AiMessage `json:"message"`
	}
)

type (
	AiContextOptions struct {
		Query     *string  `json:"query"`
		Databases []string `json:"databases"`
		Schemas   []string `json:"schemas"`
		Tables    []string `json:"tables"`
		Views     []string `json:"views"`
	}

	AiMessage struct {
		Role      string `json:"role"`
		Content   string `json:"content"`
		CreatedAt string `json:"createdAt"`
	}
)

func (req AiChatRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.ProviderId, validation.Required, validation.Min(0)),
		validation.Field(&req.Model, validation.Required, validation.Min(0)),
		validation.Field(&req.Message, validation.Required, validation.Length(0, 500)),
		validation.Field(&req.ChatId, validation.Min(0)),
	)
}
