package dto

import "github.com/invopop/validation"

type (
	AiInlineCompleteRequest struct {
		ConnectionId int32                          `json:"connectionId"`
		ProviderId   int32                          `json:"providerId"`
		Model        string                         `json:"model"`
		ContextOpts  AiInlineCompleteContextOptions `json:"contextOpts"`
	}

	AiInlineCompleteResponse struct {
		Completion string `json:"completion"`
	}
)

type (
	AiInlineCompleteContextOptions struct {
		Database *string `json:"database"`
		Schema   *string `json:"schema"`
		Prompt   string  `json:"prompt"`
		Suffix   *string `json:"suffix"`
	}
)

func (req AiInlineCompleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.ProviderId, validation.Required, validation.Min(0)),
	)
}
