package query_handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/app/response"
	pgsql "github.com/dbo-studio/dbo/internal/driver/pgsql"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/gofiber/fiber/v3"
)

func (h QueryHandler) Raw(c fiber.Ctx) error {
	req := new(dto.RawQueryRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	validate := helper.Validate(req)
	if validate != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(validate)
	}

	columns := make([]dto.GetDesignColumn, 0)
	rawQueryResult, err := h.drivers.Pgsql.RawQuery(req)
	if err != nil && rawQueryResult == nil {
		h.logger.Error(err.Error())
		return c.JSON(response.Success(response.RawQuery(&pgsql.RawQueryResult{
			Query:    req.Query,
			Columns:  nil,
			IsQuery:  false,
			Duration: "0",
		}, columns, err)))
	}

	columns = h.designService.ColumnsFormater(c.Context(), rawQueryResult.Columns)

	return c.JSON(response.Success(response.RawQuery(rawQueryResult, columns, err)))
}
