package dto

import "github.com/invopop/validation"

// RedisConnectionParams are the stored options of a Redis-family connection.
// The password is moved to the secret store on create, like for SQL connections.
type RedisConnectionParams struct {
	Host     string `json:"host"`
	Port     int32  `json:"port"`
	Username string `json:"username"`
	Password string `json:"password,omitempty"`
	// Database is the default logical db index.
	Database int32 `json:"database"`
	TLS      bool  `json:"tls"`
	// TLSInsecure skips server certificate verification.
	TLSInsecure bool `json:"tlsInsecure"`
}

func (p RedisConnectionParams) Validate() error {
	return validation.ValidateStruct(&p,
		validation.Field(&p.Host, validation.Required),
		validation.Field(&p.Port, validation.Required, validation.Min(1), validation.Max(65535)),
		validation.Field(&p.Database, validation.Min(0), validation.Max(1023)),
	)
}
