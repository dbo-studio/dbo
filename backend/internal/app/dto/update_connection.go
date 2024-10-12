package dto

import "github.com/invopop/validation"

type (
	UpdateConnectionRequest struct {
		Name            *string `json:"name"`
		Host            *string `json:"host"`
		Username        *string `json:"username"`
		Password        *string `json:"password"`
		Port            *uint   `json:"port"`
		Database        *string `json:"database"`
		IsActive        *bool   `json:"is_active"`
		CurrentDatabase *string `json:"current_database"`
		CurrentSchema   *string `json:"current_schema"`
	}
)

func (ccr UpdateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Length(0, 50)),
		validation.Field(&ccr.Host, validation.Length(0, 120)),
		validation.Field(&ccr.Username, validation.Length(0, 120)),
		validation.Field(&ccr.Password, validation.Length(0, 120)),
		validation.Field(&ccr.Port, validation.Min(0)),
	)
}
