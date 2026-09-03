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
	ErrJobNotFound                 = errors.New("job not found")
	ErrAiChatNotFound              = errors.New("ai chat not found")
	ErrProviderNotConfigured       = errors.New("provider not configured")
	ErrAiNoSelectedModel           = errors.New("select a model first")
	ErrPasswordRequired            = errors.New("password_required")
	ErrSafeModeBlocked             = errors.New("safe_mode_blocked")
	ErrSafeModeConfirmRequired     = errors.New("safe_mode_confirm_required")
	ErrSafeModePasswordRequired    = errors.New("safe_mode_password_required")
	ErrSafeModePasswordInvalid     = errors.New("safe_mode_password_invalid")
	ErrSafeModePasswordNotFound    = errors.New("safe_mode_password_not_configured")
	ErrSafeModePasswordAlreadySet  = errors.New("safe_mode_password_already_set")
	ErrSafeModePasswordMismatch    = errors.New("safe_mode_password_mismatch")
	ErrInvalidEncryptionKey        = errors.New("invalid encryption key")
	ErrDecryptionFailed            = errors.New("decryption failed")
	ErrQueryCanceled               = errors.New("query canceled")
	ErrUnauthenticated             = errors.New("authentication required")
	ErrAuthNotEnabled              = errors.New("authentication is not enabled")
	ErrInvalidSavePath             = errors.New("invalid save path")
	ErrExportQueryNotRead          = errors.New("export query must be a read-only statement")
	ErrImportFileTooLarge          = errors.New("import file is too large")
	ErrInvalidProviderURL          = errors.New("provider URL must use http or https")
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

func (h *AppError) Error() string {
	return h.Err.Error()
}

func (h *AppError) Unwrap() error {
	return h.Err
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
	if err == nil {
		return nil
	}

	var appErr *AppError
	if errors.As(err, &appErr) {
		return err
	}

	return &AppError{
		Code:    http.StatusInternalServerError,
		Message: "internal_server_error",
		Err:     err,
	}
}

// Resolve returns the most specific AppError in err's chain.
// Client errors (4xx) are preferred over server errors (5xx).
func Resolve(err error) *AppError {
	var best *AppError

	for current := err; current != nil; current = errors.Unwrap(current) {
		best = collectAppErrors(current, best)
	}

	return best
}

func collectAppErrors(err error, best *AppError) *AppError {
	var appErr *AppError
	if !errors.As(err, &appErr) {
		return best
	}

	best = preferAppError(appErr, best)
	if appErr.Err != nil {
		best = collectAppErrors(appErr.Err, best)
	}

	return best
}

func preferAppError(candidate, current *AppError) *AppError {
	if current == nil {
		return candidate
	}

	candidateIsServer := candidate.Code >= http.StatusInternalServerError
	currentIsServer := current.Code >= http.StatusInternalServerError

	if candidateIsServer && !currentIsServer {
		return current
	}

	if !candidateIsServer && currentIsServer {
		return candidate
	}

	return candidate
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

func SafeModeBlocked(data map[string]any) error {
	return &AppError{
		Code:    http.StatusForbidden,
		Message: "safe_mode_blocked",
		Err:     ErrSafeModeBlocked,
		Data:    data,
	}
}

func SafeModeConfirmRequired(data map[string]any) error {
	return &AppError{
		Code:    http.StatusForbidden,
		Message: "safe_mode_confirm_required",
		Err:     ErrSafeModeConfirmRequired,
		Data:    data,
	}
}

func SafeModePasswordRequired(data map[string]any) error {
	return &AppError{
		Code:    http.StatusForbidden,
		Message: "safe_mode_password_required",
		Err:     ErrSafeModePasswordRequired,
		Data:    data,
	}
}

func SafeModePasswordInvalid() error {
	return &AppError{
		Code:    http.StatusForbidden,
		Message: "safe_mode_password_invalid",
		Err:     ErrSafeModePasswordInvalid,
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

func QueryCanceled() error {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: "query_canceled",
		Err:     ErrQueryCanceled,
	}
}

// Unauthenticated is returned when a request has no valid session and the
// deployment requires authentication (APP_AUTH_TOKEN set).
func Unauthenticated() error {
	return &AppError{
		Code:    http.StatusUnauthorized,
		Message: "unauthenticated",
		Err:     ErrUnauthenticated,
	}
}
