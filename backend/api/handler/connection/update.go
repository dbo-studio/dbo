package connection_handler

import (
	"database/sql"

	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) UpdateConnection(c fiber.Ctx) error {
	req := new(dto.UpdateConnectionDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connection, err := h.FindConnection(c.Params("id"))
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	updatedConnection, err := h.updateConnection(connection, req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	err = h.makeAllConnectionsNotDefault(connection, req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return connectionDetail(c, updatedConnection)
}

func (h *ConnectionHandler) updateConnection(connection *model.Connection, req *dto.UpdateConnectionDto) (*model.Connection, error) {
	connection.Name = helper.OptionalString(req.Name, connection.Name)
	connection.Host = helper.OptionalString(req.Host, connection.Host)
	connection.Username = helper.OptionalString(req.Username, connection.Username)
	connection.Password = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.Password, connection.Password.String),
	}
	connection.Port = helper.OptionalUint(req.Port, connection.Port)
	connection.Database = helper.OptionalString(req.Database, connection.Database)
	connection.IsActive = helper.OptionalBool(req.IsActive, connection.IsActive)
	connection.CurrentDatabase = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.CurrentDatabase, connection.CurrentDatabase.String),
	}

	if req.CurrentDatabase != nil && req.CurrentSchema == nil {
		schemas, _ := app.Drivers().Pgsql.Schemas(int32(connection.ID), *req.CurrentDatabase)
		var currentSchema string
		if len(schemas) > 0 {
			currentSchema = schemas[0]
		}
		connection.CurrentSchema = sql.NullString{
			Valid:  true,
			String: currentSchema,
		}
	} else {
		connection.CurrentSchema = sql.NullString{
			Valid:  true,
			String: helper.OptionalString(req.CurrentSchema, connection.CurrentSchema.String),
		}
	}

	result := app.DB().Save(&connection)

	return connection, result.Error
}

func (h *ConnectionHandler) makeAllConnectionsNotDefault(connection *model.Connection, req *dto.UpdateConnectionDto) error {
	if req.IsActive != nil && *req.IsActive == true {
		result := app.DB().Model(&model.Connection{}).Not("id", connection.ID).Update("is_active", false)
		return result.Error
	}
	return nil
}
