package dto

import (
	"github.com/dbo-studio/dbo/pkg/passwordpolicy"
	validation "github.com/invopop/validation"
)

type AuthLoginResponse struct {
	TotpRequired   bool   `json:"totpRequired,omitempty"`
	ChallengeToken string `json:"challengeToken,omitempty"`
}

type AuthTotpStatusResponse struct {
	Enabled bool `json:"enabled"`
}

type AuthTotpSetupResponse struct {
	Secret     string `json:"secret"`
	OtpauthURL string `json:"otpauthUrl"`
}

type AuthTotpEnableRequest struct {
	Code string `json:"code"`
}

func (r AuthTotpEnableRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Code, validation.Required, validation.Length(6, 8)),
	)
}

type AuthTotpDisableRequest struct {
	Password string `json:"password"`
	Code     string `json:"code"`
}

func (r AuthTotpDisableRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Password, validation.Required, validation.Length(1, passwordpolicy.MaxLen)),
		validation.Field(&r.Code, validation.Required, validation.Length(6, 8)),
	)
}

type AuthLoginTotpRequest struct {
	ChallengeToken string `json:"challengeToken"`
	Code           string `json:"code"`
}

func (r AuthLoginTotpRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.ChallengeToken, validation.Required),
		validation.Field(&r.Code, validation.Required, validation.Length(6, 8)),
	)
}
