package model

import (
	"database/sql"
	"math/rand"

	"github.com/go-faker/faker/v4"
)

type Connection struct {
	ID        uint `gorm:"primaryKey"`
	Name      string
	Host      string
	Username  string
	Password  sql.NullString
	Port      int32
	Database  string
	CreatedAt sql.NullTime `gorm:"autoCreateTime"`
	UpdatedAt sql.NullTime `gorm:"autoUpdateTime"`
}

type ConnectionResource struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	Username string `json:"username"`
	Port     string `json:"port"`
	Database string `json:"database"`
}

func (c Connection) FakeConnection() *Connection {
	port := rand.Int()

	return &Connection{
		Name:     faker.Name(),
		Host:     faker.IPv4(),
		Username: faker.Username(),
		Password: sql.NullString{
			Valid:  true,
			String: faker.Password(),
		},
		Port:      int32(port),
		Database:  faker.Name(),
		CreatedAt: sql.NullTime{},
		UpdatedAt: sql.NullTime{},
	}
}

func (c Connection) SeedConnection(count int) ([]*Connection, error) {
	var results []*Connection

	for i := 0; i < count; i++ {
		results = append(results, c.FakeConnection())
	}

	return results, nil
}
