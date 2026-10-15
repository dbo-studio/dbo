package model

import "time"

type AiChat struct {
	ID           uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID      string `gorm:"index;default:''"`
	ConnectionID uint   `gorm:"not null"`
	Title        string `gorm:"not null"`
	Pinned       bool   `gorm:"not null;default:false"`
	// ContextJSON is the last explorer context (database, schema, tables, views) used in the chat.
	ContextJSON string          `gorm:"column:context_json;not null;default:''"`
	Messages    []AiChatMessage `gorm:"foreignKey:ChatID;constraint:OnDelete:CASCADE"`
	CreatedAt   *time.Time      `gorm:"autoCreateTime"`
	UpdatedAt   *time.Time      `gorm:"autoUpdateTime"`
}
