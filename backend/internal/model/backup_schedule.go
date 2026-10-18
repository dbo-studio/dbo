package model

import "time"

const (
	ScheduleCadenceHourly = "hourly"
	ScheduleCadenceDaily  = "daily"
	ScheduleCadenceWeekly = "weekly"
)

// BackupSchedule runs a backup on a fixed cadence while the DBO process is up.
// The owner's remembered connection password is what lets a run authenticate.
type BackupSchedule struct {
	ID           uint   `gorm:"primaryKey;autoIncrement"`
	OwnerID      string `gorm:"not null;default:'';index"`
	ConnectionID uint   `gorm:"not null;index"`
	Name         string `gorm:"not null;default:''"`
	Database     string `gorm:"not null;default:''"`
	Schema       string `gorm:"not null;default:''"`
	Cadence      string `gorm:"not null;default:'daily'"`
	// Hour and Minute are in Timezone; Weekday is 0 (Sunday) to 6, weekly only.
	Hour     int    `gorm:"not null;default:0"`
	Minute   int    `gorm:"not null;default:0"`
	Weekday  int    `gorm:"not null;default:0"`
	Timezone string `gorm:"not null;default:'UTC'"`
	Enabled  bool   `gorm:"not null;default:true"`
	// KeepLast and KeepDays are retention limits; zero means no limit of that kind.
	KeepLast   int `gorm:"not null;default:0"`
	KeepDays   int `gorm:"not null;default:0"`
	NextRunAt  *time.Time
	LastRunAt  *time.Time
	LastJobID  uint       `gorm:"not null;default:0"`
	LastStatus string     `gorm:"not null;default:''"`
	LastError  string     `gorm:"not null;default:''"`
	CreatedAt  *time.Time `gorm:"autoCreateTime"`
}

func (BackupSchedule) TableName() string { return "backup_schedules" }
