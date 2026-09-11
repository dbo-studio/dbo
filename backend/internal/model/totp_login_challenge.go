package model

import "time"

type TotpLoginChallenge struct {
	ID        string    `gorm:"primaryKey;column:id"`
	UserID    string    `gorm:"column:user_id;index"`
	ExpiresAt time.Time `gorm:"column:expires_at;index"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (TotpLoginChallenge) TableName() string { return "totp_login_challenges" }
