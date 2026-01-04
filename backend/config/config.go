package config

import (
	"os"
)

type App struct {
	Name          string
	Port          string
	Env           string
	DatabaseName  string
	Version       string
	ReleaseUrlApi string
	ReleaseUrl    string
	LogPath       string
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
			Name:          "dbo",
			Port:          os.Getenv("APP_PORT"),
			Env:           os.Getenv("APP_ENV"),
			Version:       "v0.4.0",
			DatabaseName:  "dbo.db",
			ReleaseUrlApi: "https://dbo-studio.com/api/config",
			ReleaseUrl:    "https://dbo-studio.com/releases",
		},
		Sentry: Sentry{
			Dsn: os.Getenv("SENTRY_DNS"),
		},
	}

	return config
}
