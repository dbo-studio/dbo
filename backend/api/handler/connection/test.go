package connection_handler

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	pgsql "github.com/dbo-studio/dbo/driver/pgsql"
	"github.com/dbo-studio/dbo/helper"
	"github.com/gofiber/fiber/v3"
)

func (h *ConnectionHandler) TestConnection(c fiber.Ctx) error {
	req := new(dto.CreateConnectionDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	_, err := app.Drivers().Pgsql.ConnectWithOptions(pgsql.ConnectionOption{
		Host:     req.Host,
		Port:     int32(req.Port),
		User:     req.Username,
		Password: req.Password,
		Database: req.Database,
	})

	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(""))
}
