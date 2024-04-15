package helper

import (
	"github.com/go-playground/validator/v10"
)

var validate = validator.New(validator.WithRequiredStructEnabled())

type ErrorResponse struct {
	Field string `json:"field"`
	Tag   string `json:"tag"`
}

func Validate(dto interface{}) []*ErrorResponse {
	var errors []*ErrorResponse
	err := validate.Struct(dto)
	if err != nil {
		for _, err := range err.(validator.ValidationErrors) {
			var element ErrorResponse
			element.Field = err.Field()
			element.Tag = err.Tag()
			errors = append(errors, &element)
		}
	}

	return errors
}
