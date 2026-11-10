package dto

import (
	"github.com/invopop/validation"
	"github.com/samber/lo"
)

const (
	SSHAuthPassword = "password"
	SSHAuthKey      = "key"
	SSHAuthAgent    = "agent"
)

// ConnectionSSHParams describes an SSH tunnel (optionally through a bastion
// jump host) used to reach a database that is not directly routable.
type ConnectionSSHParams struct {
	Enabled    bool                 `json:"enabled"`
	Host       string               `json:"host"`
	Port       int32                `json:"port"`
	Username   string               `json:"username"`
	AuthMethod string               `json:"authMethod"`
	Password   *string              `json:"password,omitempty"`
	PrivateKey *string              `json:"privateKey,omitempty"`
	Passphrase *string              `json:"passphrase,omitempty"`
	Jump       *ConnectionSSHParams `json:"jump,omitempty"`
}

func (s ConnectionSSHParams) Validate() error {
	if !s.Enabled {
		return nil
	}

	return validation.ValidateStruct(&s,
		validation.Field(&s.Host, validation.Required, validation.Length(1, 255)),
		validation.Field(&s.Port, validation.Min(0), validation.Max(65535)),
		validation.Field(&s.Username, validation.Required, validation.Length(1, 120)),
		validation.Field(&s.AuthMethod, validation.In(SSHAuthPassword, SSHAuthKey, SSHAuthAgent)),
		validation.Field(&s.PrivateKey, validation.When(s.AuthMethod == SSHAuthKey, validation.By(func(any) error {
			if lo.FromPtr(s.PrivateKey) == "" {
				return validation.NewError("validation_required", "cannot be blank")
			}

			return nil
		}))),
		validation.Field(&s.Jump),
	)
}

// NormalizeSSH fills defaults (port 22, auth method password) in place.
func NormalizeSSH(s *ConnectionSSHParams) {
	for ; s != nil; s = s.Jump {
		if s.Port == 0 {
			s.Port = 22
		}

		if s.AuthMethod == "" {
			s.AuthMethod = SSHAuthPassword
		}
	}
}

// ValidateSSHSecrets requires the secret of the chosen auth method. Used when a
// tunnel is created; updates may leave it blank to keep the stored one.
func ValidateSSHSecrets(s *ConnectionSSHParams) error {
	for ; s != nil && s.Enabled; s = s.Jump {
		switch {
		case s.AuthMethod == SSHAuthPassword && lo.FromPtr(s.Password) == "":
			return validation.Errors{"ssh": validation.NewError("validation_required", "ssh tunnel: password cannot be blank")}
		case s.AuthMethod == SSHAuthKey && lo.FromPtr(s.PrivateKey) == "":
			return validation.Errors{"ssh": validation.NewError("validation_required", "ssh tunnel: private key cannot be blank")}
		}
	}

	return nil
}
