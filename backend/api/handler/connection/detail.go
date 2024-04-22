package connection_handler

import (
	"database/sql"

	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) Connection(c fiber.Ctx) error {
	connection, err := h.FindConnection(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	return connectionDetail(c, connection)
}

func connectionDetail(c fiber.Ctx, connection *model.Connection) error {
	var schemas []string = []string{}
	var tables []string = []string{}
	var err error

	databases, _ := app.Drivers().Pgsql.Databases(int32(connection.ID), false)
	version, err := app.Drivers().Pgsql.Version(int32(connection.ID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(err.Error())
	}

	if connection.CurrentDatabase.String == "" {
		return c.JSON(response.Success(response.Connection(connection, version, databases, schemas, tables)))
	}

	schemas, _ = app.Drivers().Pgsql.Schemas(int32(connection.ID), connection.CurrentDatabase.String)
	currentSchema := connection.CurrentSchema.String

	if connection.CurrentSchema.String == "" && len(schemas) > 0 {
		currentSchema = schemas[0]
	}

	if currentSchema != "" {
		tables, err = app.Drivers().Pgsql.Tables(int32(connection.ID), currentSchema)
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

	return c.JSON(response.Success(response.Connection(connection, version, databases, schemas, tables)))
}
