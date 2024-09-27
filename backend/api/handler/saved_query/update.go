package saved_handler

import (
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/api/response"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/helper"
	"github.com/dbo-studio/dbo/model"
	"github.com/gofiber/fiber/v3"
)

func (h *SavedQueryHandler) UpdateSavedQuery(c fiber.Ctx) error {
	req := new(dto.CreateSavedQueryDto)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	query, err := h.FindSavedQuery(c.Params("id"))
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusNotFound).JSON(response.Error(err.Error()))
	}

	updatedQuery, err := h.updateSavedQuery(query, req)
	if err != nil {
		app.Log().Error(err.Error())
		return c.Status(fiber.StatusInternalServerError).JSON(response.Error(err.Error()))
	}

	return c.JSON(response.Success(response.SaveQuery(updatedQuery)))
}

func (h *SavedQueryHandler) updateSavedQuery(query *model.SavedQuery, req *dto.CreateSavedQueryDto) (*model.SavedQuery, error) {
	if req.Name != nil && len(*req.Name) == 0 {
		query.Name = req.Query[0:10]
	} else {
		query.Name = helper.OptionalString(req.Name, query.Name)
	}

	query.Query = req.Query
	result := app.DB().Save(&query)
	return query, result.Error
}
