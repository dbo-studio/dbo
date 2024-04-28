package error_c

import "fmt"

type DriverError struct {
	message string
	Err     error
	Status  int
}

func (w *DriverError) Error() string {
	return fmt.Sprintf(w.message)
}

func Driver(err error, info string) *DriverError {
	return &DriverError{
		message: info,
		Err:     err,
		Status:  400,
	}
}
