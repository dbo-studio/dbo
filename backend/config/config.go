package config

import (
	"os"
)

type App struct {
	Name           string
	Port           string
	Env            Environment
	Client         Client
	PublicURL      string
	MCPURLOverride string
	DatabaseName   string
	Version        string
	ReleaseURLAPI  string
	ReleaseURL     string
	LogPath        string
}

type Config struct {
	App App
}

var config *Config

func New() *Config {
	config = &Config{
		App: App{
			Name:           "dbo",
			Port:           os.Getenv("APP_PORT"),
			Env:            Environment(os.Getenv("APP_ENV")),
			Client:         Client(os.Getenv("APP_CLIENT")),
			PublicURL:      os.Getenv("APP_PUBLIC_URL"),
			MCPURLOverride: os.Getenv("APP_MCP_PUBLIC_URL"),
			Version:        "v1.1.0",
			DatabaseName:   "dbo.db",
			ReleaseURLAPI:  "https://dbo-studio.com/api/config",
			ReleaseURL:     "https://dbo-studio.com/releases",
		},
	}

	return config
}
