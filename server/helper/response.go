package helper

func DefaultResponse(data interface{}, message string, code int) struct {
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
} {
	r := struct {
		Data interface{} `json:"data"`

		Message string `json:"message"`
	}{
		Data:    data,
		Message: message,
	}

	return r
}
