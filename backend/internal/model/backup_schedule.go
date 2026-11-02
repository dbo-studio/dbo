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
	// Compress gzips each backup. PublicKey and WrappedKey, when set, encrypt it:
	// the passphrase is never stored, only the public key and the private key
	// wrapped by the passphrase, so a run needs no secret and no one with the
	// database can read a backup.
	Compress   bool   `gorm:"not null;default:false"`
	PublicKey  string `gorm:"not null;default:''"`
	WrappedKey string `gorm:"not null;default:''"`
	// KeepLast and KeepDays are retention limits; zero means no limit of that kind.
	KeepLast  int `gorm:"not null;default:0"`
	KeepDays  int `gorm:"not null;default:0"`
	NextRunAt *time.Time
	LastRunAt *time.Time
	// LastSuccessAt and LastSize describe the newest completed run.
	LastSuccessAt *time.Time
	LastSize      int64      `gorm:"not null;default:0"`
	LastJobID     uint       `gorm:"not null;default:0"`
	LastStatus    string     `gorm:"not null;default:''"`
	LastError     string     `gorm:"not null;default:''"`
	CreatedAt     *time.Time `gorm:"autoCreateTime"`
}

func (BackupSchedule) TableName() string { return "backup_schedules" }
