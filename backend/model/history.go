package model

import "database/sql"

type History struct {
	ID        uint         `gorm:"primaryKey,autoIncrement"`
	Query     string       `gorm:"type:text"`
	CreatedAt sql.NullTime `gorm:"autoCreateTime"`
}
