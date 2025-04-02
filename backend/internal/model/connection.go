package model

import (
	"time"

	"github.com/go-faker/faker/v4"
)

type Connection struct {
	ID             uint `gorm:"primaryKey,autoIncrement"`
	Name           string
	ConnectionType string
	Options        string
	IsActive       bool
	Version        *string
	CreatedAt      *time.Time `gorm:"autoCreateTime"`
	UpdatedAt      *time.Time `gorm:"autoUpdateTime"`
}

func (c Connection) FakeConnection() *Connection {
	return &Connection{
		Name:      faker.Name(),
		CreatedAt: nil,
		UpdatedAt: nil,
	}
}

func (c Connection) SeedConnection(count int) ([]*Connection, error) {
	var results []*Connection

	for i := 0; i < count; i++ {
		results = append(results, c.FakeConnection())
	}

	return results, nil
}
