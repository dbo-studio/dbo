package pgsql

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/khodemobin/dbo/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func (p *PostgresQueryEngine) Connect(connectionId int32) (*gorm.DB, error) {
	if conn, exists := p.OpenConnections[connectionId]; exists {
		return conn, nil
	}

	conn, err := p.Open(connectionId)
	if err != nil {
		return nil, err
	}

	p.OpenConnections[connectionId] = conn
	return conn, nil
}

func (p *PostgresQueryEngine) Open(connectionId int32) (*gorm.DB, error) {
	var connection model.Connection
	result := p.DB.Where("id", "=", connectionId).First(&connection)
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

func (p *PostgresQueryEngine) ConnectWithOptions(options ConnectionOption) (*gorm.DB, error) {
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
