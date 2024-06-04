package query_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
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
		return c.JSON(response.Error(err.Error()))
	}

	structures, err := app.Drivers().Pgsql.TableStructure(req.ConnectionId, req.Table, req.Schema, true)
	if err != nil {
		app.Log().Error(err.Error())
		return c.JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.RunQuery(runQueryResult, structures)))
}
