package model

import "time"

// AiAuditEntry records one attempt to apply an agent changeset: who ran it,
// on which connection, the SQL and how it ended. Entries outlive the chat.
type AiAuditEntry struct {
	ID           uint       `gorm:"primaryKey,autoIncrement"`
	OwnerID      string     `gorm:"index;not null;default:''"`
	ConnectionID uint       `gorm:"index;not null"`
	ChatID       uint       `gorm:"not null"`
	ChangesetID  uint       `gorm:"not null"`
	Summary      string     `gorm:"type:text;not null;default:''"`
	SQL          string     `gorm:"column:sql;type:text;not null;default:''"`
	Status       string     `gorm:"size:16;not null"`
	Error        string     `gorm:"type:text;not null;default:''"`
	CreatedAt    *time.Time `gorm:"autoCreateTime"`
}

const (
	AiAuditApplied = "applied"
	AiAuditPartial = "partial"
	AiAuditFailed  = "failed"
)
