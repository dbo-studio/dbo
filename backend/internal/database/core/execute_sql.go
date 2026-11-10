package databaseCore

import (
	"errors"
	"strings"

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

// RenameParams are the params of contract.RenameAction.
type RenameParams struct {
	Name string `json:"name"`
}

// NewNameFromParams reads and validates the new object name of a RenameAction.
func NewNameFromParams(params []byte) (string, error) {
	var parsed RenameParams
	if err := json.Unmarshal(params, &parsed); err != nil {
		return "", err
	}

	if strings.TrimSpace(parsed.Name) == "" {
		return "", errors.New("missing name")
	}

	return parsed.Name, nil
}
