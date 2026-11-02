package dto

import "github.com/invopop/validation"

type (
	DashboardListRequest struct {
		ConnectionID int32 `query:"connectionId"`
	}

	DashboardCreateRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Name         string `json:"name"`
	}

	DashboardRenameRequest struct {
		Name string `json:"name"`
	}

	DashboardPinRequest struct {
		QuestionID uint `json:"questionId"`
	}

	// DashboardCardOrderRequest lists every card of the board, in the new order.
	DashboardCardOrderRequest struct {
		CardIDs []uint `json:"cardIds"`
	}

	DashboardCardUpdateRequest struct {
		Width int `json:"width"`
	}

	DashboardCardResponse struct {
		ID       uint             `json:"id"`
		Position int              `json:"position"`
		Width    int              `json:"width"`
		Question QuestionResponse `json:"question"`
	}

	DashboardResponse struct {
		ID           uint                    `json:"id"`
		ConnectionID uint                    `json:"connectionId"`
		Name         string                  `json:"name"`
		Cards        []DashboardCardResponse `json:"cards"`
	}
)

func (req DashboardListRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)))
}

func (req DashboardCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.Name, validation.Required, validation.Length(1, 255)),
	)
}

func (req DashboardPinRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.QuestionID, validation.Required))
}

func (req DashboardCardUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.Width, validation.Required, validation.In(1, 2)))
}

func (req DashboardCardOrderRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.CardIDs, validation.Required, validation.Length(1, 500)))
}

func (req DashboardRenameRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.Name, validation.Required, validation.Length(1, 255)))
}
