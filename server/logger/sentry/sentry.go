package sentry

import (
	sysLog "log"

	"github.com/getsentry/sentry-go"
	"github.com/khodemobin/dbo/config"
	"github.com/khodemobin/dbo/logger"
)

type log struct{}

func New(cfg *config.Config) logger.Logger {
	err := sentry.Init(sentry.ClientOptions{
		Dsn: cfg.Sentry.Dsn,
	})
	if err != nil {
		sysLog.Fatalf("sentry.Init: %s", err)
	}

	return &log{}
}

func (l *log) Error(msg any) {
	sentry.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(sentry.LevelFatal)
		sentry.CaptureException(logger.GetError(msg))
	})
}

func (l *log) Fatal(msg any) {
	sentry.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(sentry.LevelFatal)
		sentry.CaptureException(logger.GetError(msg))
	})
	sysLog.Fatal(msg)
}

func (l *log) Warn(msg any) {
	sentry.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(sentry.LevelWarning)
		sentry.CaptureException(logger.GetError(msg))
	})
}

func (l *log) Info(msg any) {
	sentry.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(sentry.LevelInfo)
		sentry.CaptureException(logger.GetError(msg))
	})
}
