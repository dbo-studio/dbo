package drivers

import (
	pgsql_driver "github.com/khodemobin/dbo/drivers/pgsql"
	"gorm.io/gorm"
)

type DriverEngine struct {
	Pgsql *pgsql_driver.PostgresQueryEngine
}

func InitDrivers(db *gorm.DB) *DriverEngine {
	return &DriverEngine{
		Pgsql: pgsql_driver.InitPostgresEngine(db),
	}
}
