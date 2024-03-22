package history_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *HistoryHandler) AddHistory(c *fiber.Ctx) error {
	req := new(dto.CreateHistoryDto)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	history, err := createHistory(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.History(history)))
}

func createHistory(req *dto.CreateHistoryDto) (*model.History, error) {
	var history model.History
	if req.Name == nil {
		history.Name = req.Query[0:10]
	} else {
		history.Name = *req.Name
	}
	history.Query = req.Query
	result := app.DB().Save(&history)
	return &history, result.Error
}
