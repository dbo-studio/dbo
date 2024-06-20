package saved_handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
)

func (h *SavedQueryHandler) DeleteSavedQuery(c fiber.Ctx) error {
	query, err := h.FindSavedQuery(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	result := app.DB().Delete(query)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(""))
}
