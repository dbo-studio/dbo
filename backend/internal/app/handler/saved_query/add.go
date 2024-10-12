package saved_handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
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

	history, err := h.createSavedQuery(req)
	if err != nil {
		h.logger.Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.SaveQuery(history)))
}

func (h *SavedQueryHandler) createSavedQuery(req *dto.CreateSavedQueryDto) (*model.SavedQuery, error) {
	var query model.SavedQuery
	if req.Name == nil {
		query.Name = req.Query[0:20]
	} else {
		query.Name = *req.Name
	}
	query.Query = req.Query
	result := h.db.Save(&query)
	return &query, result.Error
}
