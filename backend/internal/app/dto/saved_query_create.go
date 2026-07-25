package dto

import "github.com/invopop/validation"

type (
	CreateSavedQueryRequest struct {
		ConnectionID int32   `json:"connectionId"`
		Name         *string `json:"name"`
		Query        string  `json:"query"`
	}

	CreateSavedQueryResponse struct {
		SavedQuery
	}
)

func (req CreateSavedQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Query, validation.Required),
	)
}
