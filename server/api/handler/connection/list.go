package handler_connection

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) Connections(c *fiber.Ctx) error {
	var connections []model.Connection

	result := app.DB().Find(&connections)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Connections(connections)))
}
