package dto

import "github.com/invopop/validation"

type (
	ConnectionCredentialsRequest struct {
		Password         string `json:"password"`
		RememberPassword bool   `json:"rememberPassword"`
	}
)

func (r ConnectionCredentialsRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Password, validation.Required, validation.Length(1, 2000)),
	)
}
