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

type Config struct {
	App App
}

var config *Config

func New() *Config {
	config = &Config{
		App: App{
			Name:          "dbo",
			Port:          os.Getenv("APP_PORT"),
			Env:           os.Getenv("APP_ENV"),
			Version:       "v0.4.1",
			DatabaseName:  "dbo.db",
			ReleaseUrlApi: "https://dbo-studio.com/api/config",
			ReleaseUrl:    "https://dbo-studio.com/releases",
		},
	}

	return config
}
