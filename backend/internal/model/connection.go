package model

import (
	"time"
)

type Connection struct {
	ID             uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID        string `gorm:"index;default:'desktop'"`
	Name           string
	ConnectionType string
	Options        string
	IsActive       bool
	Version        *string
	CreatedAt      *time.Time `gorm:"autoCreateTime"`
	UpdatedAt      *time.Time `gorm:"autoUpdateTime"`
	Histories      []History  `gorm:"foreignKey:ConnectionID;constraint:OnDelete:CASCADE"`
}
