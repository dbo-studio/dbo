package query_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
)

func (QueryHandler) Run(c *fiber.Ctx) error {
	req := new(dto.RunQueryDto)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	runQueryResult, err := app.Drivers().Pgsql.RunQuery(req)
	if err != nil {
		return c.JSON(response.Error(err.Error()))
	}

	structures, err := app.Drivers().Pgsql.TableStructure(req.ConnectionId, req.Table, req.Schema)
	if err != nil {
		return c.JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.RunQuery(runQueryResult, structures)))
}
