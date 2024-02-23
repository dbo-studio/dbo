package model

import (
	"database/sql"
	"math/rand"

	"github.com/go-faker/faker/v4"
)

type Connection struct {
	ID              uint `gorm:"primaryKey,autoIncrement"`
	Name            string
	Host            string
	Username        string
	Password        sql.NullString
	Port            uint
	Database        string
	IsActive        bool
	CurrentSchema   sql.NullString
	CurrentDatabase sql.NullString
	CreatedAt       sql.NullTime `gorm:"autoCreateTime"`
	UpdatedAt       sql.NullTime `gorm:"autoUpdateTime"`
}

type ConnectionResource struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	Username string `json:"username"`
	Port     uint   `json:"port"`
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
		Port:      uint(port),
		Database:  faker.Name(),
		CreatedAt: sql.NullTime{},
		UpdatedAt: sql.NullTime{},
		CurrentSchema: sql.NullString{
			Valid:  true,
			String: faker.Name(),
		},
		CurrentDatabase: sql.NullString{
			Valid:  true,
			String: faker.Name(),
		},
	}
}

func (c Connection) SeedConnection(count int) ([]*Connection, error) {
	var results []*Connection

	for i := 0; i < count; i++ {
		results = append(results, c.FakeConnection())
	}

	return results, nil
}
