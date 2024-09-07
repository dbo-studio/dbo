package response

import (
	"errors"
	"net/http"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3"
)

type FailedResponse struct {
	Code    int    `json:"_"`
	Message string `json:"message"`
}

func ErrorBuilder(err error) FailedResponse {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		ae := err.(*apperror.AppError)
		return FailedResponse{
			Code:    ae.Code,
			Message: ae.Error(),
		}
	}

	return FailedResponse{
		Code:    http.StatusInternalServerError,
		Message: err.Error(),
	}
}

func (x FailedResponse) Send(app fiber.Ctx) error {
	return app.Status(x.Code).JSON(x)
}

type SuccessResponse struct {
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
	Meta    interface{} `json:"meta,omitempty"`
}

func SuccessBuilder(response interface{}, meta ...interface{}) SuccessResponse {
	result := SuccessResponse{
		Data: response,
	}

	if len(meta) > 0 {
		result.Meta = meta[0]
	}

	return result
}

func (c SuccessResponse) Send(app fiber.Ctx) error {
	return app.JSON(c)
}
