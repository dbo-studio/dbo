package model

import "time"

const (
	ConnectionShareViewer = "viewer"
	ConnectionShareEditor = "editor"
)

type ConnectionShare struct {
	ConnectionID uint      `gorm:"primaryKey;column:connection_id"`
	UserID       string    `gorm:"primaryKey;column:user_id"`
	Role         string    `gorm:"column:role"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (ConnectionShare) TableName() string { return "connection_shares" }

type ConnectionSharedSecret struct {
	ConnectionID uint      `gorm:"primaryKey;column:connection_id"`
	Ciphertext   string    `gorm:"column:ciphertext"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
}

func (ConnectionSharedSecret) TableName() string { return "connection_shared_secrets" }
