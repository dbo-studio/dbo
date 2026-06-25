package response

import (
	"errors"
	"net/http"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3"
)

type FailedResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

type FailedResponseBuilder struct {
	response FailedResponse
}

func ErrorBuilder() *FailedResponseBuilder {
	return &FailedResponseBuilder{
		response: FailedResponse{
			Code:    http.StatusInternalServerError,
			Message: "",
		},
	}
}

func (b *FailedResponseBuilder) FromError(err error) *FailedResponseBuilder {
	var appErr *apperror.AppError

	if errors.As(err, &appErr) {
		var ae *apperror.AppError
		errors.As(err, &ae)
		b.response.Code = ae.Code
		b.response.Message = ae.Error()
		b.response.Data = appErr.Data
	} else {
		b.response.Message = err.Error()
	}
	return b
}

func (b *FailedResponseBuilder) Build() FailedResponse {
	return b.response
}

func (b *FailedResponseBuilder) Send(app fiber.Ctx) error {
	return app.Status(b.response.Code).JSON(b.response)
}

type SuccessResponse struct {
	Data    any    `json:"data"`
	Message string `json:"message"`
}

type SuccessResponseBuilder struct {
	response SuccessResponse
}

func SuccessBuilder() *SuccessResponseBuilder {
	return &SuccessResponseBuilder{
		response: SuccessResponse{
			Data:    nil,
			Message: "",
		},
	}
}

func (b *SuccessResponseBuilder) WithData(data any) *SuccessResponseBuilder {
	b.response.Data = data
	return b
}

func (b *SuccessResponseBuilder) WithMessage(message string) *SuccessResponseBuilder {
	b.response.Message = message
	return b
}

func (b *SuccessResponseBuilder) Send(app fiber.Ctx) error {
	return app.JSON(b.response)
}
