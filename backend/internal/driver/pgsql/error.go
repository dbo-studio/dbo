package pgsqlDriver

import (
	"errors"
	"fmt"
)

var (
	ErrConnection = errors.New("connection error")
	ErrDriver     = errors.New("driver error")
)

func ErrorBuilder(subErr, err error) error {
	return fmt.Errorf("%s: %w", subErr, err)
}

func ErrorQuery(err error, query string) error {
	return fmt.Errorf("%s: %w", query, err)
}
