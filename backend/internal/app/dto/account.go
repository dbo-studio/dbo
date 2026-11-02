package dto

import validation "github.com/invopop/validation"

type AccountConnectStartResponse struct {
	Code string `json:"code"`
	URL  string `json:"url"`
}

type AccountConnectPollRequest struct {
	Code string `json:"code"`
}

func (r AccountConnectPollRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Code, validation.Required, validation.Length(1, 16)),
	)
}

type AccountUserResponse struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Verified bool   `json:"verified"`
}

type AccountSessionResponse struct {
	Token string              `json:"token"`
	User  AccountUserResponse `json:"user"`
}

// AccountConnectPollResponse is Pending until the person confirms on the website, then carries the session.
type AccountConnectPollResponse struct {
	Pending bool                    `json:"pending"`
	Session *AccountSessionResponse `json:"session,omitempty"`
}
