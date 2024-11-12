package pgsqlDriver

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"

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

	options := ConnectionOption{
		Host: connection.Host,
		Port: connection.Port,
		User: connection.Username,
	}

	if connection.Password.Valid {
		options.Password = lo.ToPtr(connection.Password.String)
	}

	if connection.Database.Valid {
		options.Database = lo.ToPtr(connection.Database.String)
	}

	return p.ConnectWithOptions(options)
}

func (p PostgresQueryEngine) Close(connectionId int32) {
	delete(p.OpenConnections, connectionId)
}

type ConnectionOption struct {
	Host     string
	Port     int32
	User     string
	Password *string
	Database *string
}

func (p PostgresQueryEngine) ConnectWithOptions(options ConnectionOption) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s ",
		options.Host,
		strconv.Itoa(int(options.Port)),
		options.User,
	)

	if options.Database != nil && len(lo.FromPtr(options.Database)) > 0 {
		dsn += fmt.Sprintf("dbname=%s ", lo.FromPtr(options.Database))
	}

	if options.Password != nil && len(lo.FromPtr(options.Password)) > 0 {
		dsn += fmt.Sprintf("password=%s", lo.FromPtr(options.Password))
	}

	return gorm.Open(postgres.New(postgres.Config{
		DSN: dsn,
	}), &gorm.Config{})
}
