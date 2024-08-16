package history_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

type HistoryHandler struct{}

func (h *HistoryHandler) Histories(c fiber.Ctx) error {
	var histories []model.History

	result := app.DB().Limit(50).Find(&histories)

	if result.Error != nil {
		app.Log().Error(result.Error.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Histories(histories)))
}
