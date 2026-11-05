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

// AgentTier is how far the AI agent may go on a connection.
type AgentTier string

const (
	// AgentTierReadOnly — Ask only: the agent reads, never proposes changes.
	AgentTierReadOnly AgentTier = "read_only"
	// AgentTierDataWrite — the agent may propose data changes, not schema changes.
	AgentTierDataWrite AgentTier = "data_write"
	// AgentTierSchemaChange — the agent may propose data and schema changes (the default).
	AgentTierSchemaChange AgentTier = "schema_change"
)

type Connection struct {
	ID             uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID        string `gorm:"index;default:'desktop'"`
	Name           string
	ConnectionType string
	Options        string
	IsActive       bool
	// Env is the deployment tag: "", dev, uat or prod. A prod connection is write-locked until unlocked.
	Env       string    `gorm:"column:env;not null;default:''"`
	SafeMode  SafeMode  `gorm:"column:safe_mode;not null;default:'silent'"`
	AgentTier AgentTier `gorm:"column:agent_tier;not null;default:'schema_change'"`
	Version   *string
	CreatedAt *time.Time `gorm:"autoCreateTime"`
	UpdatedAt *time.Time `gorm:"autoUpdateTime"`
	Histories []History  `gorm:"foreignKey:ConnectionID;constraint:OnDelete:CASCADE"`
}
