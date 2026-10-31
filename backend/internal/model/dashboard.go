package model

import "time"

// Dashboard is a named board of saved reports on one connection.
type Dashboard struct {
	ID            uint                    `gorm:"primaryKey,autoIncrement"`
	OwnerID       string                  `gorm:"index;not null;default:''"`
	ConnectionID  uint                    `gorm:"index;not null"`
	Name          string                  `gorm:"not null"`
	Cards         []DashboardCard         `gorm:"foreignKey:DashboardID;constraint:OnDelete:CASCADE"`
	Shares        []DashboardShare        `gorm:"foreignKey:DashboardID;constraint:OnDelete:CASCADE"`
	Subscriptions []DashboardSubscription `gorm:"foreignKey:DashboardID;constraint:OnDelete:CASCADE"`
	CreatedAt     *time.Time              `gorm:"autoCreateTime"`
	UpdatedAt     *time.Time              `gorm:"autoUpdateTime"`
}

// DashboardCard places a saved report on a board. Width is 1 (half) or 2 (full row).
type DashboardCard struct {
	ID          uint     `gorm:"primaryKey,autoIncrement"`
	DashboardID uint     `gorm:"index;not null"`
	QuestionID  uint     `gorm:"index;not null"`
	Position    int      `gorm:"not null"`
	Width       int      `gorm:"not null;default:1"`
	Question    Question `gorm:"foreignKey:QuestionID"`
}
