package model

import "time"

// AiChangeset is a schema proposal the agent made in a chat. It stays on the
// server until the user applies or rejects its ops.
type AiChangeset struct {
	ID           uint            `gorm:"primaryKey,autoIncrement"`
	ChatID       uint            `gorm:"index;not null"`
	ConnectionID uint            `gorm:"not null"`
	Database     string          `gorm:"not null;default:''"`
	Schema       string          `gorm:"not null;default:''"`
	Ops          []AiChangesetOp `gorm:"foreignKey:ChangesetID;constraint:OnDelete:CASCADE"`
	CreatedAt    *time.Time      `gorm:"autoCreateTime"`
}

type AiChangesetOp struct {
	ID          uint                `gorm:"primaryKey,autoIncrement"`
	ChangesetID uint                `gorm:"index;not null"`
	Position    int                 `gorm:"not null"`
	OpJSON      string              `gorm:"column:op_json;type:text;not null"`
	Status      AiChangesetOpStatus `gorm:"size:16;not null;default:pending"`
	Error       string              `gorm:"type:text;not null;default:''"`
}

type AiChangesetOpStatus string

const (
	AiChangesetOpPending  AiChangesetOpStatus = "pending"
	AiChangesetOpAccepted AiChangesetOpStatus = "accepted"
	AiChangesetOpRejected AiChangesetOpStatus = "rejected"
	AiChangesetOpApplied  AiChangesetOpStatus = "applied"
	AiChangesetOpFailed   AiChangesetOpStatus = "failed"
)
