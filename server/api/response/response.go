package response

type Response struct {
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
}

func Success(data interface{}) *Response {
	return &Response{
		Data: data,
	}
}

func Error(message string) *Response {
	return &Response{
		Message: message,
	}
}

func (res Response) WithMessage(data interface{}, message string) *Response {
	return &Response{
		Data:    data,
		Message: message,
	}
}
