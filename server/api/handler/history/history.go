package history_handler

import (
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

type HistoryHandler struct{}

func (h *HistoryHandler) FindHistory(historyId string) (*model.History, error) {
	var history model.History
	result := app.DB().Where("id", "=", historyId).First(&history)

	return &history, result.Error
}
