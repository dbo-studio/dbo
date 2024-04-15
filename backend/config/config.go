package config

import (
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/joho/godotenv"
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
	readConfig()

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

func readConfig() {
	_, b, _, _ := runtime.Caller(0)
	path := filepath.Join(filepath.Dir(b), "../")
	envPath := path + "/.env"
	if _, err := os.Stat(envPath); err == nil {
		err := godotenv.Load(envPath)
		if err != nil {
			log.Println("error load config", err)
		}
	}
}
