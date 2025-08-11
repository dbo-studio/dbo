package dto

import "github.com/invopop/validation"

type (
	AiChatCreateRequest struct {
		Title string `json:"title"`
	}
)

func (req AiChatCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Title, validation.Required, validation.Length(1, 255)),
	)
}
