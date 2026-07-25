package model

import "time"

type McpSettings struct {
	ID                  uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID             string `gorm:"index;default:'desktop'"`
	Enabled             bool   `gorm:"default:false"`
	Port                int    `gorm:"default:5001"`
	TokenHash           *string
	DefaultConnectionID *uint
	CreatedAt           *time.Time `gorm:"autoCreateTime"`
	UpdatedAt           *time.Time `gorm:"autoUpdateTime"`
}
