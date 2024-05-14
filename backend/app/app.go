package app

import (
	"errors"
	"log"
	"os"

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
	config := config.New()
	var logger logger.Logger

	path := "logs"
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		err := os.Mkdir(path, os.ModePerm)
		if err != nil {
			log.Println(err)
		}
	}

	logger = zap.New()

	db := db.New(config, logger).DB
	err := db.AutoMigrate(&model.Connection{}, &model.SavedQuery{}, &model.History{})
	if err != nil {
		logger.Fatal(err)
	}

	Container = &AppContainer{
		DB:      db,
		Config:  config,
		Log:     logger,
		Drivers: driver.InitDrivers(db),
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
