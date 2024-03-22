package history_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *HistoryHandler) UpdateHistory(c *fiber.Ctx) error {
	req := new(dto.CreateHistoryDto)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	history, err := h.FindHistory(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	updatedHistory, err := h.updateHistory(history, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.History(updatedHistory)))
}

func (h *HistoryHandler) updateHistory(history *model.History, req *dto.CreateHistoryDto) (*model.History, error) {
	if req.Name != nil && len(*req.Name) == 0 {
		history.Name = req.Query[0:10]
	} else {
		history.Name = helper.OptionalString(req.Name, history.Name)
	}

	history.Query = req.Query
	result := app.DB().Save(&history)
	return history, result.Error
}
