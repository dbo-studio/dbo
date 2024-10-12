package dto

import "github.com/invopop/validation"

type DeleteDatabaseRequest struct {
	ConnectionId int32  `json:"connection_id"`
	Name         string `json:"name"`
}

func (ccr DeleteDatabaseRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&ccr.Name, validation.Required, validation.Length(0, 120)),
	)
}
