package dto

import (
	"github.com/dbo-studio/dbo/pkg/passwordpolicy"
	validation "github.com/invopop/validation"
	"github.com/invopop/validation/is"
)

type AuthStatusResponse struct {
	Mode               string            `json:"mode"`
	Authenticated      bool              `json:"authenticated"`
	MustChangePassword bool              `json:"mustChangePassword"`
	User               *AuthUserIdentity `json:"user,omitempty"`
}

type AuthUserIdentity struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type AuthLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r AuthLoginRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Email, validation.Required, is.EmailFormat),
		validation.Field(&r.Password, validation.Required, validation.Length(1, passwordpolicy.MaxLen)),
	)
}

type AuthChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	Password        string `json:"password"`
	Confirm         string `json:"confirm"`
}

func (r AuthChangePasswordRequest) Validate() error {
	err := validation.ValidateStruct(&r,
		validation.Field(&r.CurrentPassword, validation.Required, validation.Length(1, passwordpolicy.MaxLen)),
		validation.Field(&r.Password, validation.Required, passwordpolicy.Rule()),
		validation.Field(&r.Confirm, validation.Required, passwordpolicy.Rule()),
	)
	if err != nil {
		return err
	}

	if r.Password != r.Confirm {
		return validation.NewError("validation_password_mismatch", "password and confirm must match")
	}

	if r.Password == r.CurrentPassword {
		return validation.NewError("validation_password_unchanged", "new password must differ from current")
	}

	return nil
}

type AdminUserListItem struct {
	ID                 string  `json:"id"`
	Email              string  `json:"email"`
	Role               string  `json:"role"`
	MustChangePassword bool    `json:"mustChangePassword"`
	DisabledAt         *string `json:"disabledAt,omitempty"`
	CreatedAt          string  `json:"createdAt"`
}

type AdminCreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (r AdminCreateUserRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Email, validation.Required, is.EmailFormat),
		validation.Field(&r.Password, validation.Required, passwordpolicy.Rule()),
		validation.Field(&r.Role, validation.Required, validation.In("admin", "member")),
	)
}

type AdminUpdateUserRequest struct {
	Role     *string `json:"role"`
	Disabled *bool   `json:"disabled"`
	Password *string `json:"password"`
}

func (r AdminUpdateUserRequest) Validate() error {
	if r.Role == nil && r.Disabled == nil && r.Password == nil {
		return validation.NewError("validation_empty", "at least one field is required")
	}

	if r.Role != nil {
		if err := validation.Validate(*r.Role, validation.In("admin", "member")); err != nil {
			return err
		}
	}

	if r.Password != nil {
		if err := validation.Validate(*r.Password, validation.Required, passwordpolicy.Rule()); err != nil {
			return err
		}
	}

	return nil
}
