package handler_connection

import (
	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
)

type ConnectionHandler struct{}

func (h *ConnectionHandler) FindConnection(connectionId string) (*model.Connection, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)

	return &connection, result.Error
}
