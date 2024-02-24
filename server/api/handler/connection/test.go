package connection_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/drivers/pgsql"
	"github.com/khodemobin/dbo/helper"
)

func (h *ConnectionHandler) TestConnection(c *fiber.Ctx) error {
	req := new(dto.ConnectionDto)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	_, err := pgsql.ConnectWithOptions(pgsql.ConnectionOption{
		Host:     req.Host,
		Port:     int32(req.Port),
		User:     req.Username,
		Password: req.Password,
		Database: req.Database,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(""))
}
