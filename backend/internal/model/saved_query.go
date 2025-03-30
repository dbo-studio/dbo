package model

import "time"

type SavedQuery struct {
	ID        uint `gorm:"primaryKey,autoIncrement"`
	Name      string
	Query     string     `gorm:"type:text"`
	CreatedAt *time.Time `gorm:"autoCreateTime"`
	UpdatedAt *time.Time `gorm:"autoUpdateTime"`
}
