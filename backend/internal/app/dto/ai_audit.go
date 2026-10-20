package dto

import (
	"time"

	"github.com/invopop/validation"
)

type (
	AiAuditListRequest struct {
		ConnectionID int32 `query:"connectionId"`
		PaginationRequest
	}

	// AiAuditEntryResponse is one attempt to apply an agent changeset.
	AiAuditEntryResponse struct {
		ID          uint      `json:"id"`
		ChatID      uint      `json:"chatId"`
		ChangesetID uint      `json:"changesetId"`
		Summary     string    `json:"summary"`
		SQL         string    `json:"sql"`
		Status      string    `json:"status"`
		Error       string    `json:"error,omitempty"`
		CreatedAt   time.Time `json:"createdAt"`
	}
)

func (req AiAuditListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.Count, validation.Required, validation.Min(1), validation.Max(100)),
		validation.Field(&req.Page, validation.Required, validation.Min(1), validation.Max(100)),
	)
}
