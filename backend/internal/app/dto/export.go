package dto

import (
	"github.com/invopop/validation"
)

type (
	ExportRequest struct {
		ConnectionID int32 `json:"connectionId"`
		// Scope picks what to export: query (default; Table + Query), tables
		// (Tables), schema or database (every table under Database/Schema).
		Scope    string   `json:"scope"`
		Table    string   `json:"table"`
		Query    string   `json:"query"`
		Tables   []string `json:"tables"`
		Database string   `json:"database"`
		Schema   string   `json:"schema"`
		// Content is what a multi-table sql export writes: data (default),
		// schema, or both.
		Content   string `json:"content"`
		Format    string `json:"format"`
		ChunkSize int    `json:"chunkSize"`
		SavePath  string `json:"savePath"`
	}

	ExportResponse struct {
		JobID int32 `json:"jobId"`
	}

	ExportJob struct {
		OwnerID string `json:"ownerId"`
		ExportRequest
	}
)

const (
	ExportContentData   = "data"
	ExportContentSchema = "schema"
	ExportContentBoth   = "both"
)

const (
	ExportScopeQuery    = "query"
	ExportScopeTables   = "tables"
	ExportScopeSchema   = "schema"
	ExportScopeDatabase = "database"
)

func (req ExportRequest) IsMultiTable() bool {
	return req.Scope != "" && req.Scope != ExportScopeQuery
}

// WritesSchema reports whether the export includes DDL.
func (req ExportRequest) WritesSchema() bool {
	return req.Content == ExportContentSchema || req.Content == ExportContentBoth
}

// WritesData reports whether the export includes rows.
func (req ExportRequest) WritesData() bool {
	return req.Content != ExportContentSchema
}

func (req ExportRequest) Validate() error {
	multi := req.IsMultiTable()
	schemaOnlySQL := validation.When(req.WritesSchema(), validation.In("sql").Error("schema export requires the sql format"))

	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Scope, validation.In(ExportScopeQuery, ExportScopeTables, ExportScopeSchema, ExportScopeDatabase)),
		validation.Field(&req.Table, validation.When(!multi, validation.Required)),
		validation.Field(&req.Query, validation.When(!multi, validation.Required)),
		validation.Field(&req.Tables, validation.When(req.Scope == ExportScopeTables, validation.Required)),
		validation.Field(&req.Schema, validation.When(req.Scope == ExportScopeSchema, validation.Required)),
		validation.Field(&req.Content, validation.In(ExportContentData, ExportContentSchema, ExportContentBoth),
			validation.When(req.WritesSchema() && !multi, validation.Nil.Error("schema export requires a table scope"))),
		validation.Field(&req.Format, validation.Required, validation.In("sql", "json", "csv"), schemaOnlySQL),
		validation.Field(&req.ChunkSize, validation.Min(0), validation.Max(1000)),
	)
}
