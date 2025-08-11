package model

import "time"

type AiChatMessage struct {
	ID        uint   `gorm:"primaryKey,autoIncrement"`
	ChatId    uint   `gorm:"index;not null"`
	Role      string `gorm:"size:32;not null"`
	Content   string `gorm:"type:text;not null"`
	CreatedAt time.Time
}
