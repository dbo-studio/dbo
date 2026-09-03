package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	l "gorm.io/gorm/logger"
)

type SQLLite struct {
	logger logger.Logger
	DB     *gorm.DB
	cfg    *config.Config
	path   string
}

func New(cfg *config.Config, logger logger.Logger) *SQLLite {
	path := getDBPath(cfg, logger)
	fmt.Println("db path: " + path)

	db, err := gorm.Open(sqlite.Open(appSQLiteDSN(path)), &gorm.Config{
		Logger:                                   l.Default.LogMode(l.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		logger.Fatal(err)
	}

	if err := configureAppSQLite(db); err != nil {
		logger.Fatal(err)
	}

	return &SQLLite{
		logger: logger,
		DB:     db,
		cfg:    cfg,
		path:   path,
	}
}

func (m *SQLLite) Path() string {
	return m.path
}

func (m *SQLLite) Close() {
	sqlDB, err := m.DB.DB()
	if err != nil {
		log.Fatalln(err)
	}

	err = sqlDB.Close()
	if err != nil {
		m.logger.Fatal(err)
	}
}

func getDBPath(cfg *config.Config, logger logger.Logger) string {
	if override := strings.TrimSpace(os.Getenv("APP_DATABASE_PATH")); override != "" {
		if err := os.MkdirAll(filepath.Dir(override), 0700); err != nil {
			logger.Info(err.Error())
		}

		return override
	}

	defaultPath := "data/" + cfg.App.DatabaseName

	var dbPath string

	dbName := cfg.App.DatabaseName
	appName := cfg.App.Name

	if cfg.App.Env == config.EnvironmentDocker {
		return defaultPath
	}

	if cfg.App.Env == config.EnvironmentTesting {
		return "data/testing_" + cfg.App.DatabaseName
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		logger.Info(err.Error())
		return defaultPath
	}

	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("APPDATA")

		logger.Info("APPDATA environment variable not set")

		if appData == "" {
			return defaultPath
		}

		dbPath = filepath.Join(appData, appName, "storage", dbName)
	case "darwin":
		dbPath = filepath.Join(homeDir, "Library", "Application Support", appName, "storage", dbName)
	case "linux":
		dbPath = filepath.Join(homeDir, "."+appName, "storage", dbName)
	default:
		logger.Info("unsupported platform")
		return defaultPath
	}

	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(dbPath), 0700); err != nil {
		return defaultPath
	}

	return dbPath
}
