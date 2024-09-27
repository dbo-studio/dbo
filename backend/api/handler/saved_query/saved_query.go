package saved_handler

import (
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
)

type SavedQueryHandler struct{}

func (h *SavedQueryHandler) FindSavedQuery(savedId string) (*model.SavedQuery, error) {
	var query model.SavedQuery
	result := app.DB().Where("id", "=", savedId).First(&query)

	return &query, result.Error
}
