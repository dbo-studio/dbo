package connection_handler

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *ConnectionHandler) AddConnection(c *fiber.Ctx) error {
	req := new(dto.ConnectionDto)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connection, err := createConnection(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.Connection(connection, []string{}, []string{}, []string{})))
}

func createConnection(req *dto.ConnectionDto) (*model.Connection, error) {
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

	result := app.DB().Save(&connection)

	return &connection, result.Error
}
