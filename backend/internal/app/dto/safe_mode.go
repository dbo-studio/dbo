package dto

import (
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/invopop/validation"
)

type (
	SafeModeUnlockRequest struct {
		Password   string `json:"password"`
		TTLMinutes *int   `json:"ttlMinutes"`
	}

	SafeModeUnlockResponse struct {
		UnlockedUntil string `json:"unlockedUntil,omitempty"`
	}

	SafeModePasswordStatusResponse struct {
		Configured bool `json:"configured"`
	}

	SafeModePasswordSetRequest struct {
		Password string `json:"password"`
		Confirm  string `json:"confirm"`
	}

	SafeModePasswordVerifyRequest struct {
		Password     string `json:"password"`
		ConnectionID *int32 `json:"connectionId"`
	}

	SafeModePasswordChangeRequest struct {
		CurrentPassword string `json:"currentPassword"`
		Password        string `json:"password"`
		Confirm         string `json:"confirm"`
	}
)

func (r SafeModeUnlockRequest) Validate() error {
	err := validation.ValidateStruct(&r,
		validation.Field(&r.Password, validation.Required, validation.Length(1, 2000)),
	)
	if err != nil {
		return err
	}

	if r.TTLMinutes == nil {
		return nil
	}

	return validation.ValidateStruct(&r,
		validation.Field(&r.TTLMinutes, validation.Min(1), validation.Max(60)),
	)
}

func (r SafeModePasswordSetRequest) Validate() error {
	err := validation.ValidateStruct(&r,
		validation.Field(&r.Password, validation.Required, validation.Length(1, 72)),
		validation.Field(&r.Confirm, validation.Required, validation.Length(1, 72)),
	)
	if err != nil {
		return err
	}

	if r.Password != r.Confirm {
		return apperror.Validation(apperror.ErrSafeModePasswordMismatch)
	}

	return nil
}

func (r SafeModePasswordVerifyRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Password, validation.Required, validation.Length(1, 72)),
	)
}

func (r SafeModePasswordChangeRequest) Validate() error {
	err := validation.ValidateStruct(&r,
		validation.Field(&r.CurrentPassword, validation.Required, validation.Length(1, 72)),
		validation.Field(&r.Password, validation.Required, validation.Length(1, 72)),
		validation.Field(&r.Confirm, validation.Required, validation.Length(1, 72)),
	)
	if err != nil {
		return err
	}

	if r.Password != r.Confirm {
		return apperror.Validation(apperror.ErrSafeModePasswordMismatch)
	}

	return nil
}
