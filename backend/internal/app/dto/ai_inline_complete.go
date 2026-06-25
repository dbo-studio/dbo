package dto

import "github.com/invopop/validation"

type (
	AiInlineCompleteRequest struct {
		ConnectionID int32                          `json:"connectionId"`
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
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}
