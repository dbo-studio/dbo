package dto

import "github.com/invopop/validation"

type (
	UpdateSavedQueryRequest struct {
		Name  *string `json:"name"`
		Query string  `json:"query"`
	}

	UpdateSavedQueryResponse struct {
		SavedQuery
	}
)

func (c UpdateSavedQueryRequest) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Query, validation.Required),
	)
}
