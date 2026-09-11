package model

import "time"

type SavedQuery struct {
	ID           uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID      string `gorm:"index;default:''"`
	ConnectionID uint
	Name         string
	Query        string     `gorm:"type:text"`
	CreatedAt    *time.Time `gorm:"autoCreateTime"`
	UpdatedAt    *time.Time `gorm:"autoUpdateTime"`
	Connection   Connection `gorm:"foreignKey:ConnectionID"`
}
