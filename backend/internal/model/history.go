package model

import (
	"time"
)

type History struct {
	ID           uint `gorm:"primaryKey,autoIncrement"`
	ConnectionID uint
	Query        string     `gorm:"type:text"`
	CreatedAt    *time.Time `gorm:"autoCreateTime"`
	Connection   Connection `gorm:"foreignKey:ConnectionID"`
}
