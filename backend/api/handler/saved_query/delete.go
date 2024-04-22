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

	app.DB().Delete(query)

	return c.JSON(response.Success(""))
}
