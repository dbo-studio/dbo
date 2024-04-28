package error_c

import "fmt"

type GlobalError struct {
	message string
	Err     error
	Status  int
}

func (w *GlobalError) Error() string {
	return fmt.Sprintf("%s: %v", w.message, w.Err.Error())
}

func Global(err error, info string) *GlobalError {
	return &GlobalError{
		message: info,
		Err:     err,
		Status:  500,
	}
}
