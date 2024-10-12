package saved_handler

import (
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/gofiber/fiber/v3"
)

func (h *SavedQueryHandler) DeleteSavedQuery(c fiber.Ctx) error {
	query, err := h.FindSavedQuery(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	result := h.db.Delete(query)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(""))
}
