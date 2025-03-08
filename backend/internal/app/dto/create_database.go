package dto

import "github.com/invopop/validation"

type (
	CreateDatabaseRequest struct {
		ConnectionId int32   `json:"connectionId"`
		Name         string  `json:"name"`
		Template     *string `json:"template"`
		Encoding     *string `json:"encoding"`
		TableSpace   *string `json:"tableSpace"`
	}
)

func (ccr CreateDatabaseRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&ccr.Name, validation.Required, validation.Length(0, 120)),
		validation.Field(&ccr.Template, validation.Max(200)),
		validation.Field(&ccr.Encoding, validation.Max(200)),
		validation.Field(&ccr.TableSpace, validation.Max(200)),
	)
}
