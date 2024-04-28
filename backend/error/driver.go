package error_c

import "fmt"

type InternalError struct {
	message string
	Err     error
	Status  int
}

func (w *InternalError) Error() string {
	return fmt.Sprintf("%s: %v", w.message, w.Err)
}

func Internal(err error, info string) *InternalError {
	return &InternalError{
		message: info,
		Err:     err,
		Status:  500,
	}
}
