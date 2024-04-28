package pgsql_driver

import "gorm.io/gorm"

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
