package saved_handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khodemobin/dbo/api/dto"
	"github.com/khodemobin/dbo/api/response"
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/model"
)

func (h *SavedQueryHandler) UpdateSavedQuery(c *fiber.Ctx) error {
	req := new(dto.CreateSavedQueryDto)

	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(err.Error()))
	}

	errors := helper.Validate(req)
	if errors != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(errors)
	}

	query, err := h.FindSavedQuery(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(err.Error())
	}

	updatedQuery, err := h.updateSavedQuery(query, req)
	if err != nil {
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
