package dto

import validation "github.com/invopop/validation"

type ServerActivityRequest struct {
	ConnectionID int32  `json:"connectionId"`
	Target       string `json:"target"`
	Token        string `json:"token"`
	Confirmed    bool   `json:"confirmed"`
}

func (request ServerActivityRequest) Validate() error {
	return validation.ValidateStruct(&request,
		validation.Field(&request.ConnectionID, validation.Required, validation.Min(int32(1))),
		validation.Field(&request.Target, validation.Required),
		validation.Field(&request.Token, validation.Required),
	)
}
