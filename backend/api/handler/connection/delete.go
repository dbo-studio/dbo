package connection_handler

import (
	"github.com/dbo-studio/dbo/app"
	"github.com/gofiber/fiber/v3"
)

func (h *ConnectionHandler) DeleteConnection(c fiber.Ctx) error {
	connectionId := c.Params("id")
	connection, err := h.FindConnection(connectionId)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	result := app.DB().Delete(connection)
	if result.Error != nil {
		app.Log().Error(result.Error.Error())
	}

	return h.Connections(c)
}
