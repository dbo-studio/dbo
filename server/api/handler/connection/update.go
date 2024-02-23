package handler_connection

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) UpdateConnection(c *fiber.Ctx) error {
	req := new(dto.ConnectionDto)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connection, err := h.FindConnection(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	updatedConnection, err := updateConnection(connection, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	err = makeAllConnectionsNotDefault(connection, req)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.Connection(*updatedConnection, []string{}, []string{}, []string{})))
}

func updateConnection(connection *model.Connection, req *dto.ConnectionDto) (*model.Connection, error) {
	connection.Name = req.Name
	connection.Host = req.Host
	connection.Username = req.Username
	connection.Password = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.Password, connection.Password.String),
	}
	connection.Port = uint(req.Port)
	connection.Database = helper.OptionalString(req.Database, connection.Database)
	connection.IsActive = helper.OptionalBool(req.IsActive, connection.IsActive)
	connection.CurrentDatabase = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.CurrentDatabase, connection.CurrentDatabase.String),
	}
	connection.CurrentSchema = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.CurrentSchema, connection.CurrentSchema.String),
	}

	result := app.DB().Save(&connection)

	return connection, result.Error
}

func makeAllConnectionsNotDefault(connection *model.Connection, req *dto.ConnectionDto) error {
	if *req.IsActive {
		result := app.DB().Model(&model.Connection{}).Not("id", connection.ID).Update("is_active", false)
		return result.Error
	}
	return nil
}
