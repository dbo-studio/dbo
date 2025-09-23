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

type Trace struct {
	JaegerHost  string
	EnableTrace bool
}

type Config struct {
	App   App
	Trace Trace
}

var config *Config

func New() *Config {
	config = &Config{
		App: App{
			Name:          "dbo",
			Port:          os.Getenv("APP_PORT"),
			Env:           os.Getenv("APP_ENV"),
			Version:       "v0.3.0",
			DatabaseName:  "dbo.db",
			ReleaseUrlApi: "https://dbo-studio.com/api/config",
			ReleaseUrl:    "https://dbo-studio.com/releases",
		},
		Trace: Trace{
			JaegerHost:  os.Getenv("JAEGER_HOST"),
			EnableTrace: os.Getenv("ENABLE_TRACE") == "true",
		},
	}

	return config
}
