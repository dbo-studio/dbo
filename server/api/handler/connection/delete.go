package handler_connection

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) DeleteConnection(c *fiber.Ctx) error {
	connectionId := c.Params("id")
	app.DB().Delete(&model.Connection{}, connectionId)

	return c.JSON(response.Success(""))
}
