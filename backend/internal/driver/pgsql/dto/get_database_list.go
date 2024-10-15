package dto

import "github.com/invopop/validation"

type (
	GetDatabaseListRequest struct {
		ConnectionId int32
		FromCache    bool
	}

	GetDatabaseListResponse struct {
		Name []string
	}
)

func (r GetDatabaseListRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.ConnectionId, validation.Required, validation.Min(0)),
	)
}
