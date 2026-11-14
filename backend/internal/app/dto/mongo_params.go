package dto

import (
	"errors"
	"strings"

	"github.com/invopop/validation"
)

// MongoConnectionParams are the stored options of a MongoDB connection: either a connection string (URI) or
// host and port. The password is moved to the secret store on create; a URI keeps no password in it.
type MongoConnectionParams struct {
	URI        string `json:"uri,omitempty"`
	Host       string `json:"host"`
	Port       int32  `json:"port"`
	Username   string `json:"username"`
	Password   string `json:"password,omitempty"`
	AuthSource string `json:"authSource"`
	// Database is the default database for the terminal and the first tree expansion.
	Database string `json:"database"`
	TLS      bool   `json:"tls"`
	// TLSInsecure skips server certificate verification.
	TLSInsecure bool `json:"tlsInsecure"`
	// SSH reaches a server that is only routable from a bastion. Not supported with mongodb+srv:// (SRV
	// discovery returns hosts the tunnel cannot forward to).
	SSH *ConnectionSSHParams `json:"ssh,omitempty"`
}

func (p MongoConnectionParams) Validate() error {
	if p.URI != "" {
		if !strings.HasPrefix(p.URI, "mongodb://") && !strings.HasPrefix(p.URI, "mongodb+srv://") {
			return validation.Errors{"uri": errors.New("must start with mongodb:// or mongodb+srv://")}
		}

		if strings.HasPrefix(p.URI, "mongodb+srv://") && p.SSH != nil && p.SSH.Enabled {
			return validation.Errors{"ssh": errors.New("ssh tunnel cannot be used with a mongodb+srv:// URI; use a mongodb:// URI or host and port")}
		}

		return validation.ValidateStruct(&p, validation.Field(&p.SSH))
	}

	return validation.ValidateStruct(&p,
		validation.Field(&p.Host, validation.Required),
		validation.Field(&p.Port, validation.Required, validation.Min(1), validation.Max(65535)),
		validation.Field(&p.SSH),
	)
}
