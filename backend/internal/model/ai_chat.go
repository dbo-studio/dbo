package model

import "time"

type AiChat struct {
	ID        uint            `gorm:"primaryKey,autoIncrement"`
	Title     string          `gorm:"not null"`
	Messages  []AiChatMessage `gorm:"foreignKey:ChatId;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
