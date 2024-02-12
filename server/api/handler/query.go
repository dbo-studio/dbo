package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/drivers/pgsql"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/types"
)

type QueryHandler struct{}

func (h *QueryHandler) RunQuery(c *fiber.Ctx) error {
	req := new(types.RunQueryRequest)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	runQueryResult, err := pgsql.RunQuery(req)
	if err != nil {
		return c.JSON(response.Error(err.Error()))
	}

	structures, err := pgsql.TableStructure(req.ConnectionId, req.Table, req.Schema)
	if err != nil {
		return c.JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.RunQuery(runQueryResult, structures)))
}
