package model

import "time"

type SchemaDiagram struct {
	ID           uint       `gorm:"primaryKey,autoIncrement"`
	ConnectionID uint       `gorm:"index"`
	Schema       string     `gorm:"index"`
	Layout       string     `gorm:"type:text"` // JSON string of nodes positions and relationships
	CreatedAt    *time.Time `gorm:"autoCreateTime"`
	UpdatedAt    *time.Time `gorm:"autoUpdateTime"`
	Connection   Connection `gorm:"foreignKey:ConnectionID"`
}
