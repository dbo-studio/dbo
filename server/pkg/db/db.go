package db

import (
	"log"

	"github.com/khodemobin/dbo/internal/config"
	"github.com/khodemobin/dbo/pkg/logger"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	l "gorm.io/gorm/logger"
)

type SqlLite struct {
	logger logger.Logger
	DB     *gorm.DB
}

func New(cfg *config.Config, logger logger.Logger) *SqlLite {
	db, err := gorm.Open(sqlite.Open(cfg.App.DatabaseName), &gorm.Config{
		Logger:                                   l.Default.LogMode(l.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		logger.Fatal(err)
	}

	return &SqlLite{
		logger: logger,
		DB:     db,
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
