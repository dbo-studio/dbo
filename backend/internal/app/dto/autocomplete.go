package dto

import "github.com/invopop/validation"

type (
	AutoCompleteRequest struct {
		ConnectionID int32   `query:"connectionId"`
		Database     *string `query:"database"`
		Schema       *string `query:"schema"`
	}

	AutoCompleteResponse struct {
		Databases []string            `json:"databases"`
		Views     []string            `json:"views"`
		Schemas   []string            `json:"schemas"`
		Tables    []string            `json:"tables"`
		Columns   map[string][]string `json:"columns"`
	}
)

func (req AutoCompleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}
