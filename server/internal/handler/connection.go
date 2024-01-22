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

func (h *ConnectionHandler) AddConnection(c *fiber.Ctx) error {
	req := new(types.AddConnectionRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	}

	errors := validator.Check(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	connection := model.Connection{
		Name:     req.Name,
		Host:     req.Host,
		Username: req.Username,
		Password: sql.NullString{
			Valid:  true,
			String: req.Password,
		},
		Port:     uint(req.Port),
		Database: req.Database,
	}

	result := app.DB().Create(&connection)

	if result.Error != nil {
		return c.JSON(helper.DefaultResponse(nil, result.Error.Error(), 0))
	}

	return c.JSON(helper.DefaultResponse(connection.ToResource(), "", 1))
}

func (h *ConnectionHandler) UpdateConnection(c *fiber.Ctx) error {
	req := new(types.RunQueryRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	}

	errors := validator.Check(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	return c.JSON("")
}

func (h *ConnectionHandler) DeleteConnection(c *fiber.Ctx) error {
	req := new(types.RunQueryRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	}

	errors := validator.Check(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	return c.JSON("")
}
