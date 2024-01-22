package handler

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/internal/model"
	"github.com/khodemobin/dbo/pkg/helper"
	"github.com/khodemobin/dbo/pkg/helper/validator"
	"github.com/khodemobin/dbo/pkg/types"
)

type ConnectionHandler struct{}

func (h *ConnectionHandler) Connections(c *fiber.Ctx) error {
	var connections []model.Connection

	result := app.DB().Find(&connections)

	if result.Error != nil {
		return c.JSON(helper.DefaultResponse(nil, result.Error.Error(), 0))
	}

	var data []*model.ConnectionResource

	for _, c := range connections {
		data = append(data, c.ToResource())
	}

	return c.JSON(helper.DefaultResponse(data, "", 1))
}

func (h *ConnectionHandler) AddConnection(c *fiber.Ctx) error {
	req := new(types.ConnectionRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	}

	errors := validator.Check(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

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

	if result.Error != nil {
		return c.JSON(helper.DefaultResponse(nil, result.Error.Error(), 0))
	}

	return c.JSON(helper.DefaultResponse(connection.ToResource(), "", 1))
}

func (h *ConnectionHandler) UpdateConnection(c *fiber.Ctx) error {
	req := new(types.ConnectionRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	}

	errors := validator.Check(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connectionId := c.Params("id")
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(result.Error.Error())
	}

	connection.Name = req.Name
	connection.Host = req.Host
	connection.Username = req.Username
	connection.Password = sql.NullString{
		Valid:  true,
		String: req.Password,
	}
	connection.Port = uint(req.Port)
	connection.Database = req.Database

	result = app.DB().Save(&connection)

	if result.Error != nil {
		return c.JSON(helper.DefaultResponse(nil, result.Error.Error(), 0))
	}

	return c.JSON(helper.DefaultResponse(connection.ToResource(), "", 1))
}

func (h *ConnectionHandler) DeleteConnection(c *fiber.Ctx) error {
	connectionId := c.Params("id")
	app.DB().Delete(&model.Connection{}, connectionId)

	return c.JSON(helper.DefaultResponse("", "", 1))
}
