package config

import (
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/joho/godotenv"
)

type App struct {
	Port string
	Env  string
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
	readConfig()

	config = &Config{
		App: App{
			Port: os.Getenv("APP_PORT"),
			Env:  os.Getenv("APP_ENV"),
		},
		Sentry: Sentry{
			Dsn: os.Getenv("SENTRY_DNS"),
		},
	}

	return config
}

func readConfig() {
	_, b, _, _ := runtime.Caller(0)
	path := filepath.Join(filepath.Dir(b), "../..")
	err := godotenv.Load(path + "/.env")
	if err != nil {
		log.Println("error load config", err)
	}
}
