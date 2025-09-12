package dto

import "github.com/invopop/validation"

type (
	HistoryListRequest struct {
		ConnectionId int32 `query:"connectionId"`
		PaginationRequest
	}

	HistoryListResponse struct {
		Items []HistoryListItem
	}
)

type (
	HistoryListItem struct {
		ID           int64  `json:"id"`
		ConnectionId int32  `json:"connectionId"`
		Query        string `json:"query"`
		CreatedAt    string `json:"createdAt"`
	}
)

func (req HistoryListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Count, validation.Required, validation.Min(1), validation.Max(100)),
		validation.Field(&req.Page, validation.Required, validation.Min(1), validation.Max(100)),
	)
}
