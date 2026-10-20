package model

import "time"

type BackupStatus string

const (
	BackupStatusRunning   BackupStatus = "running"
	BackupStatusCompleted BackupStatus = "completed"
	BackupStatusFailed    BackupStatus = "failed"
)

// BackupMethod records how the artifact was produced so history stays honest
// about limits: "basic" is DBO's built-in logical dump.
type BackupMethod string

const (
	BackupMethodBasic BackupMethod = "basic"
	// BackupMethodNative is a dump made by pg_dump, mysqldump or SQLite's own
	// VACUUM INTO.
	BackupMethodNative BackupMethod = "native"
	// BackupMethodUploaded is a file the user brought for a restore.
	BackupMethodUploaded BackupMethod = "uploaded"
)

// BackupArtifact is one backup run and the file it produced. Rows exist for
// failed runs too so history shows them.
type BackupArtifact struct {
	ID           uint         `gorm:"primaryKey;autoIncrement"`
	OwnerID      string       `gorm:"not null;default:'';index"`
	ConnectionID uint         `gorm:"not null;index"`
	JobID        uint         `gorm:"not null;default:0"`
	ScheduleID   uint         `gorm:"not null;default:0;index"`
	Database     string       `gorm:"not null;default:''"`
	Schema       string       `gorm:"not null;default:''"`
	Driver       string       `gorm:"not null;default:''"`
	Method       BackupMethod `gorm:"not null;default:'basic'"`
	Tool         string       `gorm:"not null;default:''"`
	ToolVersion  string       `gorm:"not null;default:''"`
	Status       BackupStatus `gorm:"not null;default:'running'"`
	Note         string       `gorm:"not null;default:''"`
	FileName     string       `gorm:"not null;default:''"`
	FilePath     string       `gorm:"not null;default:''"`
	Size         int64        `gorm:"not null;default:0"`
	Compressed   bool         `gorm:"not null;default:false"`
	Encrypted    bool         `gorm:"not null;default:false"`
	Checksum     string       `gorm:"not null;default:''"`
	Error        string       `gorm:"not null;default:''"`
	StartedAt    time.Time    `gorm:"not null"`
	CompletedAt  *time.Time
	CreatedAt    *time.Time `gorm:"autoCreateTime"`
}

func (BackupArtifact) TableName() string { return "backup_artifacts" }
