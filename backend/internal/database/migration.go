package database

import (
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.Connection{},
		&model.History{},
		&model.SavedQuery{},
		&model.Job{},
	)
}
