package dto

import "github.com/invopop/validation"

type (
	SavedQueryListRequest struct {
		ConnectionId int32 `query:"connectionId"`
		PaginationRequest
	}

	SavedQueryListResponse struct {
		Items []SavedQuery
	}
)

type (
	SavedQuery struct {
		ID           int64  `json:"id"`
		ConnectionId int32  `json:"connectionId"`
		Name         string `json:"name"`
		Query        string `json:"query"`
		CreatedAt    string `json:"createdAt"`
	}
)

func (req SavedQueryListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
	)
}
