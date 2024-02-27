package app

import (
	"errors"
	"log"
	"os"

	"github.com/khodemobin/dbo/config"
	"github.com/khodemobin/dbo/db"
	"github.com/khodemobin/dbo/helper"
	"github.com/khodemobin/dbo/logger"
	"github.com/khodemobin/dbo/logger/sentry"
	"github.com/khodemobin/dbo/logger/syslog"
	"github.com/khodemobin/dbo/logger/zap"
	"github.com/khodemobin/dbo/model"
	"gorm.io/gorm"
)

type AppContainer struct {
	DB     *gorm.DB
	Log    logger.Logger
	Config *config.Config
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

	if helper.IsLocal() {
		logger = zap.New()
	} else if config.App.Env == "test" {
		logger = syslog.New()
	} else {
		logger = sentry.New(Container.Config)
	}

	db := db.New(config, logger).DB
	err := db.AutoMigrate(&model.Connection{})
	if err != nil {
		logger.Fatal(err)
	}

	Container = &AppContainer{
		DB:     db,
		Config: config,
		Log:    logger,
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
