package model

import "time"

type WebConnectionSecret struct {
	SessionID    string     `gorm:"primaryKey;column:session_id"`
	ConnectionID uint       `gorm:"primaryKey;column:connection_id"`
	Ciphertext   string     `gorm:"column:ciphertext"`
	Remember     bool       `gorm:"column:remember"`
	ExpiresAt    *time.Time `gorm:"column:expires_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"`
}

func (WebConnectionSecret) TableName() string { return "web_connection_secrets" }
