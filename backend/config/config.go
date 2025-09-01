package config

import (
	"os"
)

type App struct {
	Name         string
	Port         string
	Env          string
	DatabaseName string
	Version      string
}

type Sentry struct {
	Dsn string
}

type Config struct {
	App    App
	Sentry Sentry
}

var config *Config

func New() *Config {
	config = &Config{
		App: App{
			Name:         "dbo",
			Port:         os.Getenv("APP_PORT"),
			Env:          os.Getenv("APP_ENV"),
			Version:      "0.2.5",
			DatabaseName: "dbo.db",
		},
		Sentry: Sentry{
			Dsn: os.Getenv("SENTRY_DNS"),
		},
	}

	return config
}
