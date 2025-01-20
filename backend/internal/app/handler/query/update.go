package query_handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/gofiber/fiber/v3"
)

func (h QueryHandler) Update(c fiber.Ctx) error {
	req := new(dto.UpdateQueryDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	updateQueryResult, err := h.drivers.Pgsql.UpdateQuery(req)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(updateQueryResult))
}
