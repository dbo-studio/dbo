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

const (
	AiFeedbackUp   = "up"
	AiFeedbackDown = "down"
)

type (
	// AiChatFeedbackRequest is the user's decision to send a rating of the
	// newest answer, with the question and answer, to the DBO team.
	AiChatFeedbackRequest struct {
		Rating  string `json:"rating"`
		Comment string `json:"comment"`
	}
)

func (req AiChatFeedbackRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Rating, validation.Required, validation.In(AiFeedbackUp, AiFeedbackDown)),
		validation.Field(&req.Comment, validation.Length(0, 2000)),
	)
}
