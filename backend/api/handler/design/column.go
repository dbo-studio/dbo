package design_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
)

func (h DesignHandler) ColumnList(c fiber.Ctx) error {
	req := new(dto.DesignGetColumnListDto)

	if err := c.Bind().Query(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	structures, err := app.Drivers().Pgsql.TableStructure(req.ConnectionId, req.Table, req.Schema, false)
	if err != nil {
		app.Log().Error(err.Error())
		return c.JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(structures))
}

func (h DesignHandler) UpdateDesign(c fiber.Ctx) error {
	req := new(dto.DesignDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	updateDesignResult, err := app.Drivers().Pgsql.UpdateDesign(req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusUnprocessableEntity).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(updateDesignResult))
}
