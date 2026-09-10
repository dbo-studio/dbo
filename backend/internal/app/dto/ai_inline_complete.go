package dto

import "github.com/invopop/validation"

type (
	AiInlineCompleteRequest struct {
		ConnectionID int32                          `json:"connectionId"`
		ContextOpts  AiInlineCompleteContextOptions `json:"contextOpts"`
	}

	AiInlineCompleteContextOptions struct {
		Database *string `json:"database"`
		Schema   *string `json:"schema"`
		Prompt   string  `json:"prompt"`
		Suffix   *string `json:"suffix"`
	}

	AiInlineCompleteResponse struct {
		Completion string `json:"completion"`
	}
)

func (req AiInlineCompleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}
