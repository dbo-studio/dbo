package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/pkg/drivers"
	"github.com/khodemobin/dbo/pkg/helper"
	"github.com/khodemobin/dbo/pkg/helper/validator"
	"github.com/khodemobin/dbo/pkg/types"
)

type QueryHandler struct{}

func (h *QueryHandler) RunQuery(c *fiber.Ctx) error {
	req := new(types.RunQueryRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(helper.DefaultResponse(nil, err.Error(), 0))
	}

	errors := validator.Check(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	result, err := drivers.RunQuery(req)
	if err != nil {
		return c.JSON(helper.DefaultResponse("", err.Error(), 0))
	}

	return c.JSON(helper.DefaultResponse(result, "", 1))
}
