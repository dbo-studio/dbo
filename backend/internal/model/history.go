package model

import "time"

type History struct {
	ID        uint       `gorm:"primaryKey,autoIncrement"`
	Query     string     `gorm:"type:text"`
	CreatedAt *time.Time `gorm:"autoCreateTime"`
}
