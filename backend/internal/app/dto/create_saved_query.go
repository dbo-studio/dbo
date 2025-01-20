package dto

import "github.com/invopop/validation"

type (
	CreateSavedQueryRequest struct {
		Name  *string `json:"name"`
		Query string  `json:"query"`
	}

	CreateSavedQueryResponse struct {
		SavedQuery
	}
)

func (c CreateSavedQueryRequest) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Query, validation.Required),
	)
}
