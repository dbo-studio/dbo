package model

import (
	"time"
)

// SafeMode is the connection safety policy mode (TablePlus-aligned).
type SafeMode string

const (
	// SafeModeSilent — send queries without warnings.
	SafeModeSilent SafeMode = "silent"
	// SafeModeAlert — warn before every query.
	SafeModeAlert SafeMode = "alert"
	// SafeModeAlertWrite — warn before non-read queries.
	SafeModeAlertWrite SafeMode = "alert_write"
	// SafeModeSafe — require password before every query.
	SafeModeSafe SafeMode = "safe"
	// SafeModeSafeWrite — require password before non-read queries.
	SafeModeSafeWrite SafeMode = "safe_write"
)

type Connection struct {
	ID             uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID        string `gorm:"index;default:'desktop'"`
	Name           string
	ConnectionType string
	Options        string
	IsActive       bool
	SafeMode       SafeMode `gorm:"column:safe_mode;not null;default:'silent'"`
	Version        *string
	CreatedAt      *time.Time `gorm:"autoCreateTime"`
	UpdatedAt      *time.Time `gorm:"autoUpdateTime"`
	Histories      []History  `gorm:"foreignKey:ConnectionID;constraint:OnDelete:CASCADE"`
}
