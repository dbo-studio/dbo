package model

import "time"

// DashboardShare is a link that shows one dashboard read-only to people without an account.
// Only a hash of the link's token is stored, so the link itself is shown once, when it is made.
type DashboardShare struct {
	ID           uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID      string `gorm:"index;not null;default:''"`
	DashboardID  uint   `gorm:"index;not null"`
	TokenHash    string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null;default:''"`
	ExpiresAt    *time.Time
	RevokedAt    *time.Time
	// AllowFilters lets a viewer change the report filters; otherwise the link shows each report's saved values.
	AllowFilters bool `gorm:"not null;default:false"`
	ViewCount    int  `gorm:"not null;default:0"`
	LastViewedAt *time.Time
	CreatedAt    *time.Time `gorm:"autoCreateTime"`
}

const (
	ShareViewOK               = "ok"
	ShareViewPasswordRequired = "password_required"
	ShareViewWrongPassword    = "wrong_password"
)

// DashboardShareView is one visit to a share link: when, how it went, and from where.
type DashboardShareView struct {
	ID       uint      `gorm:"primaryKey,autoIncrement"`
	ShareID  uint      `gorm:"index;not null"`
	ViewedAt time.Time `gorm:"not null"`
	Outcome  string    `gorm:"not null"`
	IP       string    `gorm:"not null;default:''"`
}
