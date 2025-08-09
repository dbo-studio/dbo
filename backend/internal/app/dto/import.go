package dto

import (
	"mime/multipart"

	"github.com/invopop/validation"
)

type (
	ImportRequest struct {
		ConnectionId    int32                 `form:"connectionId"`
		Table           string                `form:"table"`
		Data            *multipart.FileHeader `form:"data"`
		Format          string                `form:"format"`
		ContinueOnError bool                  `form:"continueOnError"`
		SkipErrors      bool                  `form:"skipErrors"`
		MaxErrors       int                   `form:"maxErrors"`
	}

	ImportResponse struct {
		JobId int32 `json:"jobId"`
	}
)

type (
	ImportJob struct {
		ConnectionId    int32
		Table           string
		Data            []byte
		Format          string
		ContinueOnError bool
		SkipErrors      bool
		MaxErrors       int
	}
)

func (req ImportRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Table, validation.Required),
		validation.Field(&req.Data, validation.Required),
		validation.Field(&req.Format, validation.Required, validation.In("sql", "json", "csv")),
		validation.Field(&req.MaxErrors, validation.Min(0), validation.Max(100)),
	)
}
