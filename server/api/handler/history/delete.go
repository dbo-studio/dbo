package history_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
)

func (h *HistoryHandler) DeleteHistory(c *fiber.Ctx) error {
	history, err := h.FindHistory(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	app.DB().Delete(history)

	return c.JSON(response.Success(""))
}
