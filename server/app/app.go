package app

import (
	"github.com/khodemobin/dbo/internal/config"
	"github.com/khodemobin/dbo/internal/model"
	"github.com/khodemobin/dbo/pkg/db"
	"github.com/khodemobin/dbo/pkg/helper"
	"github.com/khodemobin/dbo/pkg/logger"
	"github.com/khodemobin/dbo/pkg/logger/sentry"
	"github.com/khodemobin/dbo/pkg/logger/syslog"
	"github.com/khodemobin/dbo/pkg/logger/zap"
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
	if helper.IsLocal() {
		logger = zap.New()
	} else if config.App.Env == "test" {
		logger = syslog.New()
	} else {
		logger = sentry.New(Container.Config)
	}

	db := db.New(config, logger).DB
	db.AutoMigrate(&model.Connection{})

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
