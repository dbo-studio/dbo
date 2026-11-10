package model

import "time"

// Question is a saved report: a read-only query on a connection and how to chart it.
// Dashboards reuse it, so it keeps the name the dashboards PRD gives it.
type Question struct {
	ID           uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID      string `gorm:"index;not null;default:''"`
	ConnectionID uint   `gorm:"index;not null"`
	Database     string `gorm:"not null;default:''"`
	Schema       string `gorm:"not null;default:''"`
	Name         string `gorm:"not null"`
	SQL          string `gorm:"column:sql;type:text;not null"`
	ChartJSON    string `gorm:"column:chart_json;type:text;not null;default:'{}'"`
	// ParamsJSON holds the default values of the {{filters}} in SQL.
	ParamsJSON string     `gorm:"column:params_json;type:text;not null;default:'{}'"`
	CreatedAt  *time.Time `gorm:"autoCreateTime"`
	UpdatedAt  *time.Time `gorm:"autoUpdateTime"`
}
