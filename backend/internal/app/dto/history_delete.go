package dto

import "github.com/invopop/validation"

type (
	DeleteHistoryRequest struct {
		ConnectionID int32 `query:"connectionId"`
	}
)

func (req DeleteHistoryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}
