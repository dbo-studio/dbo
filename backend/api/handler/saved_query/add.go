package saved_handler

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
	"github.com/dbo-studio/dbo/model"
	"github.com/gofiber/fiber/v3"
)

func (h *SavedQueryHandler) AddSavedQuery(c fiber.Ctx) error {
	req := new(dto.CreateSavedQueryDto)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	history, err := createSavedQuery(req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.SaveQuery(history)))
}

func createSavedQuery(req *dto.CreateSavedQueryDto) (*model.SavedQuery, error) {
	var query model.SavedQuery
	if req.Name == nil {
		query.Name = req.Query[0:20]
	} else {
		query.Name = *req.Name
	}
	query.Query = req.Query
	result := app.DB().Save(&query)
	return &query, result.Error
}
