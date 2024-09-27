package database_handler

import (
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/gofiber/fiber/v3"
)

func (h *DatabaseHandler) DatabaseMetaData(c fiber.Ctx) error {
	connection, err := h.FindConnection(c.Query("connection_id"))
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	databases, err := app.Drivers().Pgsql.Databases(int32(connection.ID), true)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	tableSpaces, err := app.Drivers().Pgsql.TableSpaces(int32(connection.ID))
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	encodings := app.Drivers().Pgsql.Encodes()
	datatypes := app.Drivers().Pgsql.DataTypes()

	return c.JSON(response.Success(response.DatabaseMetaData(databases, tableSpaces, encodings, datatypes)))
}
