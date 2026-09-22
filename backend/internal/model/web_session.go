package model

import "time"

type WebSession struct {
	ID                string     `gorm:"primaryKey;column:id"`
	UserID            *string    `gorm:"column:user_id;index"`
	CreatedAt         time.Time  `gorm:"column:created_at"`
	LastSeenAt        time.Time  `gorm:"column:last_seen_at"`
	AbsoluteExpiresAt *time.Time `gorm:"column:absolute_expires_at"`
}

func (WebSession) TableName() string { return "web_sessions" }
