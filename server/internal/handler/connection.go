package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/pkg/helper"
	"github.com/khodemobin/dbo/pkg/helper/validator"
	"github.com/khodemobin/dbo/pkg/types"
)

type ConnectionHandler struct{}

func (h *ConnectionHandler) AddConnection(c *fiber.Ctx) error {
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
