package connection_handler

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/drivers/pgsql"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) Connection(c *fiber.Ctx) error {
	connection, err := h.FindConnection(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	return connectionDetail(c, connection)
}

func connectionDetail(c *fiber.Ctx, connection *model.Connection) error {
	var schemas []string = []string{}
	var tables []string = []string{}
	var err error

	databases, _ := pgsql.Databases(int32(connection.ID), false)
	if connection.CurrentDatabase.String == "" {
		return c.JSON(response.Success(response.Connection(connection, databases, schemas, tables)))
	}

	schemas, _ = pgsql.Schemas(int32(connection.ID), connection.CurrentDatabase.String)
	currentSchema := connection.CurrentSchema.String

	if connection.CurrentSchema.String == "" && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if currentSchema != "" {
		tables, err = pgsql.Tables(int32(connection.ID), currentSchema)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
		}
	}

	app.DB().Model(&connection).Updates(&model.Connection{
		CurrentSchema: sql.NullString{
			String: currentSchema,
			Valid:  true,
		},
		IsActive: true,
	})

	return c.JSON(response.Success(response.Connection(connection, databases, schemas, tables)))
}
