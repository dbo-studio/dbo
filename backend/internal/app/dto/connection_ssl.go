package dto

import "github.com/invopop/validation"

type ConnectionSSLParams struct {
	Mode       string  `json:"mode"`
	CACert     *string `json:"caCert,omitempty"`
	ClientCert *string `json:"clientCert,omitempty"`
	ClientKey  *string `json:"clientKey,omitempty"`
}

const (
	SSLModeDisable    = "disable"
	SSLModeAllow      = "allow"
	SSLModePrefer     = "prefer"
	SSLModeRequire    = "require"
	SSLModeVerifyCA   = "verify-ca"
	SSLModeVerifyFull = "verify-full"
)

func (s ConnectionSSLParams) Validate() error {
	return validation.ValidateStruct(&s,
		validation.Field(&s.Mode, validation.When(s.Mode != "", validation.In(
			SSLModeDisable,
			SSLModeAllow,
			SSLModePrefer,
			SSLModeRequire,
			SSLModeVerifyCA,
			SSLModeVerifyFull,
			"preferred",
			"off",
			"false",
			"required",
			"true",
			"verify_ca",
			"verify-identity",
			"verify_identity",
		))),
	)
}

func NormalizeSSLMode(mode string) string {
	switch mode {
	case SSLModeDisable, SSLModeAllow, SSLModePrefer, SSLModeRequire, SSLModeVerifyCA, SSLModeVerifyFull:
		return mode
	case "":
		return SSLModePrefer
	case "preferred":
		return SSLModePrefer
	case "off", "false":
		return SSLModeDisable
	case "required", "true":
		return SSLModeRequire
	case "verify_ca":
		return SSLModeVerifyCA
	case "verify-identity", "verify_identity":
		return SSLModeVerifyFull
	default:
		return mode
	}
}

func DefaultSSLParams() *ConnectionSSLParams {
	return &ConnectionSSLParams{Mode: SSLModePrefer}
}
