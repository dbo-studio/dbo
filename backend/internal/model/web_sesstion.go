package model

import "time"

type WebSession struct {
	ID         string    `gorm:"primaryKey;column:id"`
	CreatedAt  time.Time `gorm:"column:created_at"`
	LastSeenAt time.Time `gorm:"column:last_seen_at"`
}

func (WebSession) TableName() string { return "web_sessions" }
