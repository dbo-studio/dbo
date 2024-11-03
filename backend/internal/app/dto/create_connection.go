package dto

import (
	"github.com/invopop/validation"
)

type (
	CreateConnectionRequest struct {
		Name     string `json:"name"`
		Host     string `json:"host"`
		Username string `json:"username"`
		Password string `json:"password,omitempty"`
		Port     int32  `json:"port"`
		Database string `json:"database,omitempty"`
	}

	AuthDetails struct {
		Database string `json:"database"`
		Host     string `json:"host"`
		Port     int32  `json:"port"`
		Username string `json:"username"`
	}
)

func (ccr CreateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Required, validation.Length(0, 50)),
		validation.Field(&ccr.Host, validation.Required, validation.Length(0, 120)),
		validation.Field(&ccr.Username, validation.Required, validation.Length(0, 120)),
		validation.Field(&ccr.Password, validation.Length(0, 120)),
		validation.Field(&ccr.Port, validation.Required, validation.Min(0)),
	)
}
