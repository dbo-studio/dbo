package app

import (
	"github.com/khodemobin/dbo/internal/config"
	"github.com/khodemobin/dbo/pkg/helper"
	"github.com/khodemobin/dbo/pkg/logger"
	"github.com/khodemobin/dbo/pkg/logger/sentry"
	"github.com/khodemobin/dbo/pkg/logger/syslog"
	"github.com/khodemobin/dbo/pkg/logger/zap"
)

type AppContainer struct {
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

	Container = &AppContainer{
		Config: config,
		Log:    logger,
	}
}

func Log() logger.Logger {
	return Container.Log
}

func Config() *config.Config {
	return Container.Config
}
