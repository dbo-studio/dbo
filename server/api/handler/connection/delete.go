package connection_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
)

func (h *ConnectionHandler) DeleteConnection(c *fiber.Ctx) error {
	connectionId := c.Params("id")
	connection, err := h.FindConnection(connectionId)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	app.DB().Delete(connection)

	return c.JSON(response.Success(""))
}