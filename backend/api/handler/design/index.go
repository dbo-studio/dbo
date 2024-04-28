package design_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
)

func (h DesignHandler) IndexList(c fiber.Ctx) error {
	req := new(dto.DesignGetColumnListDto)

	if err := c.Bind().Query(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	indexes, err := app.Drivers().Pgsql.Indexes(req.ConnectionId, req.Table, req.Schema)
	if err != nil {
		return c.JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(indexes))
}
