package dto

import "github.com/invopop/validation"

type (
	AiChatCreateRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Title        string `json:"title"`
	}
)

func (req AiChatCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Title, validation.Required, validation.Length(1, 255)),
	)
}
