package database_handler

import (
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
)

type DatabaseHandler struct{}

func (h *DatabaseHandler) FindConnection(connectionId string) (*model.Connection, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)

	return &connection, result.Error
}
