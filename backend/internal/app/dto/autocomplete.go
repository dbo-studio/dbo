package dto

import "github.com/invopop/validation"

type (
	AutoCompleteRequest struct {
		ConnectionId int32   `query:"connectionId"`
		FromCache    bool    `query:"fromCache"`
		Database     *string `query:"database"`
		Schema       *string `query:"schema"`
	}

	AutoCompleteResponse struct {
		Databases []string `json:"databases"`
		Views     []string `json:"views"`
		Schemas   []string `json:"schemas"`
		Tables    []string `json:"tables"`
		Columns   []string `json:"columns"`
	}
)

func (req AutoCompleteRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
	)
}
