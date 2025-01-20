package query_handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/gofiber/fiber/v3"
)

func (h QueryHandler) Run(c fiber.Ctx) error {
	req := new(dto.RunQueryDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	runQueryResult, err := h.drivers.Pgsql.RunQuery(req)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	columns, err := h.designService.ColumnList(c.Context(), &dto.GetDesignColumnRequest{
		ConnectionId: req.ConnectionId,
		Table:        req.Table,
		Schema:       req.Schema,
	}, true)

	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.RunQuery(runQueryResult, columns.Columns, req.Columns)))
}
