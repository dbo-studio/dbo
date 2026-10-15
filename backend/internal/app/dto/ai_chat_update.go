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
	AiReviewApplied   = "applied"
	AiReviewRejected  = "rejected"
	AiReviewConfirmed = "confirmed"
	// AiReviewPending releases a "confirmed" claim whose write did not run
	// (failed or cancelled), so the card can be confirmed again.
	AiReviewPending = "pending"
)

type (
	// AiChatReviewRequest records the user's decision on a diagram_diff
	// (changesetId) or permission (requestId) card so it survives reloads and
	// other devices.
	AiChatReviewRequest struct {
		ID       string `json:"id"`
		Decision string `json:"decision"`
	}
)

func (req AiChatReviewRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ID, validation.Required, validation.Length(1, 64)),
		validation.Field(&req.Decision, validation.Required, validation.In(AiReviewApplied, AiReviewRejected, AiReviewConfirmed, AiReviewPending)),
	)
}
