package dto

import (
	validation "github.com/invopop/validation"
)

type ConnectionShareMember struct {
	UserID    string `json:"userId"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CreatedAt string `json:"createdAt"`
}

type ConnectionSharesResponse struct {
	PasswordShared bool                    `json:"passwordShared"`
	Members        []ConnectionShareMember `json:"members"`
}

type CreateConnectionShareRequest struct {
	UserID         string `json:"userId"`
	Role           string `json:"role"`
	PasswordShared *bool  `json:"passwordShared,omitempty"`
}

func (r CreateConnectionShareRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.UserID, validation.Required),
		validation.Field(&r.Role, validation.Required, validation.In("viewer", "editor")),
	)
}

type UpdateConnectionShareRequest struct {
	Role string `json:"role"`
}

func (r UpdateConnectionShareRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Role, validation.Required, validation.In("viewer", "editor")),
	)
}

type UpdatePasswordShareRequest struct {
	Enabled *bool `json:"enabled"`
}

func (r UpdatePasswordShareRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Enabled, validation.Required),
	)
}

type AdminConnectionShare struct {
	ConnectionID   int64                   `json:"connectionId"`
	ConnectionName string                  `json:"connectionName"`
	OwnerID        string                  `json:"ownerId"`
	OwnerEmail     string                  `json:"ownerEmail"`
	PasswordShared bool                    `json:"passwordShared"`
	Members        []ConnectionShareMember `json:"members"`
}

type AdminConnectionCatalogItem struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	OwnerID    string `json:"ownerId"`
	OwnerEmail string `json:"ownerEmail"`
}
