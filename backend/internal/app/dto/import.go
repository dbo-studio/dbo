package dto

import (
	"mime/multipart"

	"github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/invopop/validation"
)

type (
	ImportRequest struct {
		ConnectionID    int32                 `form:"connectionId"`
		Table           string                `form:"table"`
		Data            *multipart.FileHeader `form:"data"`
		Format          string                `form:"format"`
		Delimiter       string                `form:"delimiter"`
		Mapping         string                `form:"mapping"` // JSON object: file column -> table column
		ContinueOnError bool                  `form:"continueOnError"`
		SkipErrors      bool                  `form:"skipErrors"`
		MaxErrors       int                   `form:"maxErrors"`
	}

	ImportPreviewRequest struct {
		Data      *multipart.FileHeader `form:"data"`
		Format    string                `form:"format"`
		Delimiter string                `form:"delimiter"`
	}

	ImportPreviewResponse struct {
		Columns   []string   `json:"columns"`
		Rows      [][]string `json:"rows"`
		TotalRows int        `json:"totalRows"`
	}

	ImportResponse struct {
		JobID int32 `json:"jobId"`
	}
)

type (
	ImportJob = databaseContract.ImportJob
)

func (req ImportRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Table, validation.Required),
		validation.Field(&req.Data, validation.Required),
		validation.Field(&req.Format, validation.Required, validation.In("sql", "json", "csv")),
		validation.Field(&req.Delimiter, validation.Length(0, 1)),
		validation.Field(&req.MaxErrors, validation.Min(0), validation.Max(100)),
	)
}

func (req ImportPreviewRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Data, validation.Required),
		validation.Field(&req.Format, validation.Required, validation.In("sql", "json", "csv")),
		validation.Field(&req.Delimiter, validation.Length(0, 1)),
	)
}
