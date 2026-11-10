package dto

import "github.com/invopop/validation"

const (
	// MaxCliInput bounds one terminal line.
	MaxCliInput = 8192
	// CliRowLimit caps rows returned to the terminal.
	CliRowLimit = 200
)

type CliRunRequest struct {
	ConnectionID int32  `json:"connectionId"`
	Input        string `json:"input"`
	Confirmed    bool   `json:"confirmed"`
}

func (req CliRunRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.Input, validation.Required, validation.Length(1, MaxCliInput)),
	)
}

// CliResult is what the terminal prints. Kind "table" carries Columns and Rows; "value" carries Output (NoSQL replies).
type CliResult struct {
	Kind      string   `json:"kind"`
	Columns   []string `json:"columns,omitempty"`
	Rows      [][]any  `json:"rows,omitempty"`
	Output    any      `json:"output,omitempty"`
	RowCount  int      `json:"rowCount"`
	Truncated bool     `json:"truncated"`
	// Engine tells the terminal how to prompt and highlight ("sql" or "nosql").
	Engine string `json:"engine"`
}
