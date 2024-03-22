package saved_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *SavedQueryHandler) AddSavedQuery(c *fiber.Ctx) error {
	req := new(dto.CreateSavedQueryDto)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	history, err := createSavedQuery(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.SaveQuery(history)))
}

func createSavedQuery(req *dto.CreateSavedQueryDto) (*model.SavedQuery, error) {
	var query model.SavedQuery
	if req.Name == nil {
		query.Name = req.Query[0:10]
	} else {
		query.Name = *req.Name
	}
	query.Query = req.Query
	result := app.DB().Save(&query)
	return &query, result.Error
}
