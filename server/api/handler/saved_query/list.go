package saved_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

func (h *SavedQueryHandler) SavedQueries(c *fiber.Ctx) error {
	var queries []model.SavedQuery

	result := app.DB().Find(&queries)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.SavedQueries(queries)))
}
