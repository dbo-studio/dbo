package dto

import (
	"github.com/invopop/validation"
	"github.com/invopop/validation/is"
)

type (
	CreateConnectionRequest struct {
		Name     string `json:"name"`
		Host     string `json:"host"`
		Username string `json:"username"`
		Password string `json:"password"`
		Port     int    `json:"port"`
		Database string `json:"database"`
	}

	CreateConnectionResponse struct {
		ConnectionDetailResponse
	}

	AuthDetails struct {
		Database string `json:"database"`
		Host     string `json:"host"`
		Port     int    `json:"port"`
		Username string `json:"username"`
	}
)

func (ccr CreateConnectionRequest) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Name, validation.Required, validation.Length(0, 50)),
		validation.Field(&ccr.Host, validation.Required, validation.Length(0, 120)),
		validation.Field(&ccr.Username, validation.Required, validation.Length(0, 120)),
		validation.Field(&ccr.Password, validation.Required, validation.Length(0, 120)),
		validation.Field(&ccr.Port, validation.Required, validation.Min(0), is.Digit),
	)
}
