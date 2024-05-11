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

func (h *ConnectionHandler) AddConnection(c fiber.Ctx) error {
	req := new(dto.CreateConnectionDto)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connection, err := createConnection(req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return connectionDetail(c, connection)
}

func createConnection(req *dto.CreateConnectionDto) (*model.Connection, error) {
	var connection model.Connection
	connection.Name = req.Name
	connection.Host = req.Host
	connection.Username = req.Username
	connection.Password = sql.NullString{
		Valid:  true,
		String: req.Password,
	}
	connection.Port = uint(req.Port)
	connection.Database = req.Database
	connection.CurrentDatabase = sql.NullString{
		String: req.Database,
		Valid:  true,
	}

	result := app.DB().Save(&connection)

	return &connection, result.Error
}
