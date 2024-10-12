package saved_handler

import (
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/gofiber/fiber/v3"
)

func (h *SavedQueryHandler) SavedQueries(c fiber.Ctx) error {
	var queries []model.SavedQuery

	result := h.db.Find(&queries)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.SavedQueries(queries)))
}
