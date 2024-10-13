package dto

import "github.com/invopop/validation"

type (
	CreateSavedQueryRequest struct {
		Name  *string `json:"name"`
		Query string  `json:"query" validate:"required"`
	}
)

func (c CreateSavedQueryRequest) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Query, validation.Required),
	)
}
