package dto

import (
	"time"

	"github.com/invopop/validation"
)

type (
	NotificationListRequest struct {
		Limit  int `query:"limit"`
		Offset int `query:"offset"`
	}

	NotificationResponse struct {
		ID        uint       `json:"id"`
		Kind      string     `json:"kind"`
		JobType   string     `json:"jobType"`
		Title     string     `json:"title"`
		Body      string     `json:"body"`
		JobID     *uint      `json:"jobId"`
		Read      bool       `json:"read"`
		CreatedAt *time.Time `json:"createdAt"`
	}

	NotificationListResponse struct {
		Items  []NotificationResponse `json:"items"`
		Unread int64                  `json:"unread"`
	}
)

func (req NotificationListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Limit, validation.Min(0), validation.Max(100)),
		validation.Field(&req.Offset, validation.Min(0)),
	)
}
