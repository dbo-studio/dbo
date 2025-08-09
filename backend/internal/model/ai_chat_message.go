package model

import "time"

type AIChatMessage struct {
	ID        uint   `gorm:"primaryKey,autoIncrement"`
	ChatId    uint   `gorm:"index;not null"`
	Role      string `gorm:"size:32;not null"`
	Content   string `gorm:"type:text;not null"`
	CreatedAt time.Time
}
