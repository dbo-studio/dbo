package history_handler

import (
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
	"github.com/gofiber/fiber/v3"
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
