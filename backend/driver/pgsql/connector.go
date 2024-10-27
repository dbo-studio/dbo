package pgsqlDriver

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/dbo-studio/dbo/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func (p PostgresQueryEngine) Connect(connectionId int32) (*gorm.DB, error) {
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

func (p PostgresQueryEngine) Open(connectionId int32) (*gorm.DB, error) {
	var connection model.Connection
	result := p.DB.Where("id", "=", connectionId).First(&connection)
	if result.Error != nil {
		return nil, errors.New("connection not found")
	}

	return p.ConnectWithOptions(ConnectionOption{
		Host:     connection.Host,
		Port:     int32(connection.Port),
		User:     connection.Username,
		Password: connection.Password.String,
		Database: connection.Database,
	})
}

func (p PostgresQueryEngine) Close(connectionId int32) {
	delete(p.OpenConnections, connectionId)
}

type ConnectionOption struct {
	Host     string
	Port     int32
	User     string
	Password string
	Database string
}

func (p PostgresQueryEngine) ConnectWithOptions(options ConnectionOption) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s ",
		options.Host,
		strconv.Itoa(int(options.Port)),
		options.User,
	)

	if len(options.Database) > 0 {
		dsn += fmt.Sprintf("dbname=%s ", options.Database)
	}

	if len(options.Password) > 0 {
		dsn += fmt.Sprintf("password=%s", options.Password)
	}

	return gorm.Open(postgres.New(postgres.Config{
		DSN: dsn,
	}), &gorm.Config{})
}
