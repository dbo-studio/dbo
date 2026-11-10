package model

import "time"

const (
	NotificationJobCompleted = "job_completed"
	NotificationJobFailed    = "job_failed"
	// NotificationSubscriptionPaused tells the owner a scheduled report stopped sending after repeated failures.
	NotificationSubscriptionPaused = "subscription_paused"
	NotificationTypeSubscription   = "subscription"
)

// Notification is an entry of the notification center: a finished or failed job the user may have missed.
// The payload stays on the job; the row only points at it.
type Notification struct {
	ID      uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID string `gorm:"not null;default:'';index:idx_notifications_owner_read,priority:1"`
	Kind    string `gorm:"not null"`
	// JobType is the job's type, so the UI can word and route the entry without loading the job.
	JobType   string `gorm:"not null;default:''"`
	Title     string `gorm:"not null"`
	Body      string `gorm:"not null;default:''"`
	JobID     *uint
	ReadAt    *time.Time `gorm:"index:idx_notifications_owner_read,priority:2"`
	CreatedAt *time.Time `gorm:"autoCreateTime"`
}
