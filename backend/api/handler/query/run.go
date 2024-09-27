package query_handler

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
	"github.com/gofiber/fiber/v3"
)

func (QueryHandler) Run(c fiber.Ctx) error {
	req := new(dto.RunQueryDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	runQueryResult, err := app.Drivers().Pgsql.RunQuery(req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	structures, err := app.Drivers().Pgsql.TableStructure(req.ConnectionId, req.Table, req.Schema, true)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.RunQuery(runQueryResult, structures, req.Columns)))
}
