package dto

import "github.com/invopop/validation"

type (
	SafeModeUnlockRequest struct {
		TTLMinutes *int `json:"ttlMinutes"`
	}

	SafeModeUnlockResponse struct {
		UnlockedUntil string `json:"unlockedUntil"`
	}
)

func (r SafeModeUnlockRequest) Validate() error {
	if r.TTLMinutes == nil {
		return nil
	}

	return validation.ValidateStruct(&r,
		validation.Field(&r.TTLMinutes, validation.Min(1), validation.Max(60)),
	)
}
