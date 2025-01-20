package db

import (
	"fmt"
	"github.com/dbo-studio/dbo/pkg/logger"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/dbo-studio/dbo/config"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	l "gorm.io/gorm/logger"
)

type SqlLite struct {
	logger logger.Logger
	DB     *gorm.DB
	cfg    *config.Config
}

func New(cfg *config.Config, logger logger.Logger) *SqlLite {
	path := getDBPath(cfg, logger)
	fmt.Println("db path: " + path)

	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{
		Logger:                                   l.Default.LogMode(l.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		logger.Fatal(err)
	}

	return &SqlLite{
		logger: logger,
		DB:     db,
		cfg:    cfg,
	}
}

func (m *SqlLite) Close() {
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
	defaultPath := "data/" + cfg.App.DatabaseName
	var dbPath string
	dbName := cfg.App.DatabaseName
	appName := cfg.App.Name

	if cfg.App.Env == "docker" {
		return defaultPath
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
