package query_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
)

func (QueryHandler) Autocomplete(c fiber.Ctx) error {
	req := new(dto.AutoCompleteDto)

	if err := c.Bind().Query(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	r, err := app.Drivers().Pgsql.AutoComplete(req.ConnectionId, req.Database)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(r))
}
