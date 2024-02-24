package connection_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/drivers/pgsql"
)

func (h *ConnectionHandler) Connection(c *fiber.Ctx) error {
	connection, err := h.FindConnection(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	databases, _ := pgsql.Databases(int32(connection.ID), false)
	schemas, _ := pgsql.Schemas(int32(connection.ID))
	currentSchema := connection.CurrentSchema.String
	var tables []string

	if !connection.CurrentSchema.Valid && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if connection.CurrentSchema.Valid {
		tables, err = pgsql.Tables(int32(connection.ID), currentSchema)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
		}
	}

	return c.JSON(response.Success(response.Connection(connection, databases, schemas, tables)))
}
