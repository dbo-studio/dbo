package pgsql

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/khodemobin/dbo/app"
	"github.com/khodemobin/dbo/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(connectionId int32) (*gorm.DB, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return nil, errors.New("connection not found")
	}

	dsn := fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s",
		connection.Host,
		strconv.Itoa(int(connection.Port)),
		connection.Database,
		connection.Username,
		connection.Password.String,
	)

	return gorm.Open(postgres.New(postgres.Config{
		DSN: dsn,
	}), &gorm.Config{})
}
