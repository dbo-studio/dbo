package pgsql_driver

import (
	"github.com/khodemobin/dbo/model"
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

func (e PostgresQueryEngine) DBLogger(query string) {
	go func(query string) {
		model := model.History{
			Query: query,
		}
		e.DB.Save(&model)
	}(query)
}
