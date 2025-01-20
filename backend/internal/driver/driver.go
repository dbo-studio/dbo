package driver

import (
	"github.com/dbo-studio/dbo/internal/driver/pgsql"
	"gorm.io/gorm"
)

type DriverEngine struct {
	Pgsql *pgsqlDriver.PostgresQueryEngine
}

func InitDrivers(db *gorm.DB) *DriverEngine {
	return &DriverEngine{
		Pgsql: pgsqlDriver.InitPostgresEngine(db),
	}
}
