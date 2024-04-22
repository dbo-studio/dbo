package database_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
)

func (h *DatabaseHandler) DatabaseMetaData(c fiber.Ctx) error {
	connection, err := h.FindConnection(c.Query("connection_id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	databases, err := app.Drivers().Pgsql.Databases(int32(connection.ID), true)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
	}

	tableSpaces, err := app.Drivers().Pgsql.TableSpaces(int32(connection.ID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
	}
	encodings := app.Drivers().Pgsql.Encodes()

	return c.JSON(response.Success(response.DatabaseMetaData(databases, tableSpaces, encodings)))
}
