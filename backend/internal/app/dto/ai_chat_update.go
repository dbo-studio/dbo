package dto

import (
	"errors"

	"github.com/invopop/validation"
)

type (
	AiChatUpdateRequest struct {
		Title  *string `json:"title"`
		Pinned *bool   `json:"pinned"`
	}
)

func (req AiChatUpdateRequest) Validate() error {
	if req.Title == nil && req.Pinned == nil {
		return errors.New("title or pinned is required")
	}

	return validation.ValidateStruct(&req,
		validation.Field(&req.Title, validation.NilOrNotEmpty, validation.Length(1, 255)),
	)
}
