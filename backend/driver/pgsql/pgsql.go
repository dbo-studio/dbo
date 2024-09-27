package pgsqlDriver

import (
	"github.com/dbo-studio/dbo/model"
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
		model := model.History{
			Query: query,
		}
		p.DB.Save(&model)
	}(query)
}
