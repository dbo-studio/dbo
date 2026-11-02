package databaseCore

import (
	"errors"

	"github.com/goccy/go-json"
)

// ExecuteSQLParams are the params of contract.ExecuteSQLAction.
type ExecuteSQLParams struct {
	SQL string `json:"sql"`
}

// SQLFromParams reads the statement of an ExecuteSQLAction step.
func SQLFromParams(params []byte) ([]string, error) {
	var parsed ExecuteSQLParams
	if err := json.Unmarshal(params, &parsed); err != nil {
		return nil, err
	}

	if parsed.SQL == "" {
		return nil, errors.New("missing statement")
	}

	return []string{parsed.SQL}, nil
}
