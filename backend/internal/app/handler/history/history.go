package history_handler

import (
	"github.com/dbo-studio/dbo/internal/app/response"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type HistoryHandler struct {
	logger logger.Logger
	db     *gorm.DB
}

func NewHistoryHandler(logger logger.Logger, db *gorm.DB) *HistoryHandler {
	return &HistoryHandler{
		logger: logger,
		db:     db,
	}
}

func (h *HistoryHandler) Histories(c fiber.Ctx) error {
	var histories []model.History

	result := h.db.Limit(50).Find(&histories)

	if result.Error != nil {
		h.logger.Error(result.Error.Error())
		return c.Status(fiber.StatusBadRequest).JSON(response.Error(result.Error.Error()))
	}

	return c.JSON(response.Success(response.Histories(histories)))
}
