package pgsqlDriver

import (
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type PostgresQueryEngine struct {
	OpenConnections map[int32]*gorm.DB
	DB              *gorm.DB
}

func InitPostgresEngine(db *gorm.DB) *PostgresQueryEngine {
	return &PostgresQueryEngine{
		OpenConnections: map[int32]*gorm.DB{},
		DB:              db,
	}
}

func (p PostgresQueryEngine) DBLogger(query string) {
	go func(query string) {
		p.DB.Save(&model.History{
			Query: query,
		})
	}(query)
}
