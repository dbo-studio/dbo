package dto

import "github.com/invopop/validation"

type (
	DeleteHistoryRequest struct {
		ConnectionId int32 `query:"connectionId"`
	}
)

func (req DeleteHistoryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
	)
}
