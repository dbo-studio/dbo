package model

import "time"

type AiChat struct {
	ID           uint            `gorm:"primaryKey,autoIncrement"`
	OwnerID      string          `gorm:"index;default:''"`
	ConnectionID uint            `gorm:"not null"`
	Title        string          `gorm:"not null"`
	Messages     []AiChatMessage `gorm:"foreignKey:ChatID;constraint:OnDelete:CASCADE"`
	CreatedAt    *time.Time      `gorm:"autoCreateTime"`
	UpdatedAt    *time.Time      `gorm:"autoUpdateTime"`
}
