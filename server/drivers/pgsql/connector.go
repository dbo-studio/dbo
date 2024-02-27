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
	// todo should check if connection exists return that
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

type ConnectionOption struct {
	Host     string
	Port     int32
	User     string
	Password string
	Database string
}

func ConnectWithOptions(options ConnectionOption) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s",
		options.Host,
		strconv.Itoa(int(options.Port)),
		options.Database,
		options.User,
		options.Password,
	)

	return gorm.Open(postgres.New(postgres.Config{
		DSN: dsn,
	}), &gorm.Config{})
}
