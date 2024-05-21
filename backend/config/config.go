package config

import (
	"os"
)

type App struct {
	Port         string
	Env          string
	DatabaseName string
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
			Port:         os.Getenv("APP_PORT"),
			Env:          os.Getenv("APP_ENV"),
			DatabaseName: os.Getenv("DB_NAME"),
		},
		Sentry: Sentry{
			Dsn: os.Getenv("SENTRY_DNS"),
		},
	}

	return config
}
