package database_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/drivers/pgsql"
)

func (h *DatabaseHandler) DatabaseMetaData(c *fiber.Ctx) error {
	connection, err := h.FindConnection(c.Query("connection_id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	databases, err := pgsql.Databases(int32(connection.ID), true)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
	}

	tableSpaces, err := pgsql.TableSpaces(int32(connection.ID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
	}
	encodings := pgsql.Encodes()

	return c.JSON(response.Success(response.DatabaseMetaData(databases, tableSpaces, encodings)))
}
