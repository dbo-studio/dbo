package dto

import "github.com/invopop/validation"

type (
	AiChatCreateRequest struct {
		ConnectionId int32  `json:"connectionId"`
		Title        string `json:"title"`
	}
)

func (req AiChatCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Title, validation.Required, validation.Length(1, 255)),
	)
}
