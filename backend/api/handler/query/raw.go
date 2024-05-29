package query_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
)

func (QueryHandler) Raw(c fiber.Ctx) error {
	req := new(dto.RawQueryDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	validate := helper.Validate(req)
	if validate != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(validate)
	}

	rawQueryResult, err := app.Drivers().Pgsql.RawQuery(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.RawQuery(rawQueryResult, err)))
}
