package saved_handler

import (
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
	"github.com/gofiber/fiber/v3"
)

func (h *SavedQueryHandler) SavedQueries(c fiber.Ctx) error {
	var queries []model.SavedQuery

	result := app.DB().Find(&queries)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.SavedQueries(queries)))
}
