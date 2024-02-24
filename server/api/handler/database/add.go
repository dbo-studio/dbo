package database_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/drivers/pgsql"
	"github.com/khodemobin/dbo/helper"
)

func (h *DatabaseHandler) AddDatabase(c *fiber.Ctx) error {
	dto := new(dto.DatabaseDto)
	if err := c.BodyParser(dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(dto)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	err := pgsql.CreateDatabase(dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(""))
}
