package database_handler

import (
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

type DatabaseHandler struct{}

func (h *DatabaseHandler) FindConnection(connectionId string) (*model.Connection, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)

	return &connection, result.Error
}
