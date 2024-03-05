package drivers

import (
	"github.com/khodemobin/dbo/drivers/pgsql"
	"gorm.io/gorm"
)

type DriverEngine struct {
	Pgsql *pgsql.PostgresQueryEngine
}

func InitDrivers(db *gorm.DB) *DriverEngine {
	return &DriverEngine{
		Pgsql: pgsql.InitPostgresEngine(db),
	}
}
