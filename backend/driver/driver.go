package driver

import (
	pgsqlDriver "github.com/dbo-studio/dbo/driver/pgsql"
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
