package app

import (
	"github.com/dbo-studio/dbo/cache"
	"github.com/dbo-studio/dbo/cache/sqlite"
	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/db"
	"github.com/dbo-studio/dbo/driver"
	"github.com/dbo-studio/dbo/logger"
	"github.com/dbo-studio/dbo/logger/zap"
	"github.com/dbo-studio/dbo/model"
	"gorm.io/gorm"
)

type AppContainer struct {
	DB      *gorm.DB
	Log     logger.Logger
	Config  *config.Config
	Drivers *driver.DriverEngine
	Cache   cache.Cache
}

var Container *AppContainer = nil

func New() {
	cfg := config.New()
	appLogger := zap.New(cfg)
	appDB := db.New(cfg, appLogger).DB
	err := appDB.AutoMigrate(&model.CacheItem{}, &model.Connection{}, &model.SavedQuery{}, &model.History{})
	if err != nil {
		appLogger.Fatal(err)
	}

	Container = &AppContainer{
		DB:      appDB,
		Config:  cfg,
		Log:     appLogger,
		Drivers: driver.InitDrivers(appDB),
		Cache:   sqlite.NewSQLiteCache(appDB),
	}
}

func DB() *gorm.DB {
	return Container.DB
}

func Log() logger.Logger {
	return Container.Log
}

func Config() *config.Config {
	return Container.Config
}

func Drivers() *driver.DriverEngine {
	return Container.Drivers
}

func Cache() cache.Cache {
	return Container.Cache
}
