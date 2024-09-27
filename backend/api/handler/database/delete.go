package database_handler

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
	"github.com/gofiber/fiber/v3"
)

func (h *DatabaseHandler) DeleteDatabase(c fiber.Ctx) error {
	dto := new(dto.DeleteDatabaseDto)
	if err := c.Bind().Body(dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(dto)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	err := app.Drivers().Pgsql.DropDatabase(dto)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(""))
}
