package config

import (
	"os"
)

type App struct {
	Name          string
	Port          string
	Env           Environment
	Client        Client
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
			Env:           Environment(os.Getenv("APP_ENV")),
			Client:        Client(os.Getenv("APP_CLIENT")),
			Version:       "v0.4.2",
			DatabaseName:  "dbo.db",
			ReleaseUrlApi: "https://dbo-studio.com/api/config",
			ReleaseUrl:    "https://dbo-studio.com/releases",
		},
	}

	return config
}
