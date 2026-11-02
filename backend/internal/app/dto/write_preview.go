package dto

// WritePreviewRequest asks what an INSERT, UPDATE or DELETE would change.
type WritePreviewRequest struct {
	ConnectionID int32
	Database     *string
	Schema       *string
	SQL          string
}

// WritePreviewResponse is the number of rows the statement changes and, when
// they can be read, the rows it would touch.
type WritePreviewResponse struct {
	SQL          string           `json:"sql"`
	AffectedRows int64            `json:"affectedRows"`
	Columns      []string         `json:"columns"`
	Rows         []map[string]any `json:"rows"`
	// SampleQuery is the SELECT that read the rows, to run again or open in the Data Grid.
	SampleQuery string `json:"sampleQuery,omitempty"`
}
