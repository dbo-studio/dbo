package app

import (
	"github.com/khodemobin/dbo/config"
	"github.com/khodemobin/dbo/db"
	"github.com/khodemobin/dbo/driver"
	"github.com/khodemobin/dbo/logger"
	"github.com/khodemobin/dbo/logger/zap"
	"github.com/khodemobin/dbo/model"
	"gorm.io/gorm"
)

type AppContainer struct {
	DB      *gorm.DB
	Log     logger.Logger
	Config  *config.Config
	Drivers *driver.DriverEngine
}

var Container *AppContainer = nil

func New() {
	cfg := config.New()
	appLogger := zap.New(cfg)
	appDB := db.New(cfg, appLogger).DB
	err := appDB.AutoMigrate(&model.Connection{}, &model.SavedQuery{}, &model.History{})
	if err != nil {
		appLogger.Fatal(err)
	}

	Container = &AppContainer{
		DB:      appDB,
		Config:  cfg,
		Log:     appLogger,
		Drivers: driver.InitDrivers(appDB),
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
