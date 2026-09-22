package model

import "time"

type TotpLoginChallenge struct {
	ID        string    `gorm:"primaryKey;column:id"`
	UserID    string    `gorm:"column:user_id;index"`
	Attempts  int       `gorm:"column:attempts;not null;default:0"`
	ExpiresAt time.Time `gorm:"column:expires_at;index"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (TotpLoginChallenge) TableName() string { return "totp_login_challenges" }
