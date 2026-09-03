package model

import "time"

type SafeModePassword struct {
	OwnerID      string    `gorm:"primaryKey;column:owner_id"`
	PasswordHash string    `gorm:"column:password_hash"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
}

func (SafeModePassword) TableName() string { return "safe_mode_passwords" }
