package database

import (
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.CacheItem{},
		&model.Connection{},
		&model.History{},
		&model.SavedQuery{},
		&model.Job{},
		&model.AiProvider{},
		&model.AiChat{},
		&model.AiChatMessage{},
		&model.SchemaDiagram{},
	)
}
