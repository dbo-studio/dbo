package apperror

import (
	"errors"
	"net/http"
	"strings"
)

var (
	ErrConnectionNotFound          = errors.New("connection not found")
	ErrWebConnectionSecretNotFound = errors.New("web connection secret not found")
	ErrSavedQueryNotFound          = errors.New("query not found")
	ErrAiProviderNotFound          = errors.New("ai provider not found")
	ErrJobCannotCancel             = errors.New("job cannot cancel")
	ErrJobNotCompleted             = errors.New("job not completed")
	ErrAiChatNotFound              = errors.New("ai chat not found")
	ErrProviderNotConfigured       = errors.New("provider not configured")
	ErrAiNoSelectedModel           = errors.New("select a model first")
	ErrPasswordRequired            = errors.New("password_required")
	ErrInvalidEncryptionKey        = errors.New("invalid encryption key")
	ErrDecryptionFailed            = errors.New("decryption failed")
)

type AppError struct {
	Code    int
	Err     error
	Message string
	Data    map[string]any
}

func Equals(err error, expectedErr error) bool {
	return strings.EqualFold(err.Error(), expectedErr.Error())
}

func (h AppError) Error() string {
	return h.Err.Error()
}

func BadRequest(err error) error {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: "bad_request",
		Err:     err,
	}
}

func Validation(err error) error {
	return &AppError{
		Code:    http.StatusUnprocessableEntity,
		Message: "validation",
		Err:     err,
	}
}

func InternalServerError(err error) error {
	return &AppError{
		Code:    http.StatusInternalServerError,
		Message: "internal_server_error",
		Err:     err,
	}
}

func Unauthorized(connectionID uint) error {
	return &AppError{
		Code:    http.StatusUnauthorized,
		Message: "unauthorized",
		Err:     ErrPasswordRequired,
		Data:    map[string]any{"connectionId": connectionID},
	}
}

func Forbidden(err error) error {
	return &AppError{
		Code:    http.StatusForbidden,
		Message: "forbidden",
		Err:     err,
	}
}

func NotFound(err error) error {
	return &AppError{
		Code:    http.StatusNotFound,
		Message: "not_found",
		Err:     err,
	}
}

func Conflict(err error) error {
	return &AppError{
		Code:    http.StatusConflict,
		Message: "Conflict",
		Err:     err,
	}
}

func GatewayTimeout(err error) error {
	return &AppError{
		Code:    http.StatusGatewayTimeout,
		Message: "gateway_timeout",
		Err:     err,
	}
}

func DriverError(err error) error {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: "driver_error",
		Err:     err,
	}
}
