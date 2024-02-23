package handler_connection

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/drivers/pgsql"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) Connection(c *fiber.Ctx) error {
	connectionId := c.Params("id")

	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(result.Error.Error())
	}

	databases, _ := pgsql.Databases(int32(connection.ID))
	schemas, _ := pgsql.Schemas(int32(connection.ID))
	currentSchema := connection.CurrentSchema.String
	var tables []string
	var err error

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
