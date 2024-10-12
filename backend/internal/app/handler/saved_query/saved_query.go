package saved_handler

import (
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type SavedQueryHandler struct {
	logger logger.Logger
	db     *gorm.DB
}

func NewSavedQueryHandler(logger logger.Logger, db *gorm.DB) *SavedQueryHandler {
	return &SavedQueryHandler{
		logger: logger,
		db:     db,
	}
}

func (h *SavedQueryHandler) FindSavedQuery(savedId string) (*model.SavedQuery, error) {
	var query model.SavedQuery
	result := h.db.Where("id", "=", savedId).First(&query)

	return &query, result.Error
}
