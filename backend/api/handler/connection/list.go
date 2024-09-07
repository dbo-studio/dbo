package connection_handler

import (
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
	"github.com/gofiber/fiber/v3"
)

func (h *ConnectionHandler) Connections(c fiber.Ctx) error {
	var connections []model.Connection

	result := app.DB().Find(&connections)

	if result.Error != nil {
		app.Log().Error(result.Error.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Connections(connections)))
}
