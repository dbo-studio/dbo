package model

import "time"

type AiChat struct {
	ID        uint            `gorm:"primaryKey,autoIncrement"`
	Title     string          `gorm:"not null"`
	Messages  []AIChatMessage `gorm:"foreignKey:ChatId;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
