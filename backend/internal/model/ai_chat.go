package model

import "time"

type AiChat struct {
	ID           uint   `gorm:"primaryKey,autoIncrement"`
	ConnectionID uint   `gorm:"not null"`
	Title        string `gorm:"not null"`
	ProviderId   *uint
	Model        *string
	Messages     []AiChatMessage `gorm:"foreignKey:ChatId;constraint:OnDelete:CASCADE"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
