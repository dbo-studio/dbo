package driver

import (
	"github.com/dbo-studio/dbo/internal/driver/pgsql/engine"
	"gorm.io/gorm"
)

type DriverEngine struct {
	Pgsql *engine.PostgresQueryEngine
}

func InitDrivers(db *gorm.DB) *DriverEngine {
	return &DriverEngine{
		Pgsql: engine.InitPostgresEngine(db),
	}
}
