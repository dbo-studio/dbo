package dto

import (
	"github.com/invopop/validation"
)

type (
	ExportRequest struct {
		ConnectionId int32  `json:"connectionId"`
		Table        string `json:"table"`
		Query        string `json:"query"`
		Format       string `json:"format"`
		ChunkSize    int    `json:"chunkSize"`
		SavePath     string `json:"savePath"`
	}

	ExportResponse struct {
		JobId int32 `json:"jobId"`
	}
)

func (req ExportRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Table, validation.Required),
		validation.Field(&req.Query, validation.Required),
		validation.Field(&req.Format, validation.Required, validation.In("sql", "json", "csv")),
		validation.Field(&req.ChunkSize, validation.Min(0), validation.Max(1000)),
	)
}
