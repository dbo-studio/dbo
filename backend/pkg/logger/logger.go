package logger

import (
	"errors"
	"fmt"
)

type Logger interface {
	Error(msg any)
	Fatal(msg any)
	Warn(msg any)
	Info(msg any)
}

func GetError(message any) error {
	switch msg := message.(type) {
	case error:
		return msg
	case string:
		return errors.New(msg)
	default:
		panic(fmt.Sprintf("message %v has unknown type %v", message, msg))
	}
}
