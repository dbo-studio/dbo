package model

import "database/sql"

type SavedQuery struct {
	ID        uint `gorm:"primaryKey,autoIncrement"`
	Name      string
	Query     string       `gorm:"type:text"`
	CreatedAt sql.NullTime `gorm:"autoCreateTime"`
	UpdatedAt sql.NullTime `gorm:"autoUpdateTime"`
}
