package model

import "time"

const (
	SubscriptionKindEmail   = "email"
	SubscriptionKindWebhook = "webhook"

	SubscriptionHourly = "hourly"
	SubscriptionDaily  = "daily"
	SubscriptionWeekly = "weekly"

	SubscriptionRunOK     = "ok"
	SubscriptionRunFailed = "failed"
)

// DashboardSubscription sends a dashboard snapshot (a CSV per report and a summary) on a schedule,
// by email or to a webhook.
type DashboardSubscription struct {
	ID          uint   `gorm:"primaryKey,autoIncrement"`
	OwnerID     string `gorm:"index;not null;default:''"`
	DashboardID uint   `gorm:"index;not null"`
	Kind        string `gorm:"not null"`
	// Target is a comma-separated list of addresses for email, or the URL for a webhook.
	Target string `gorm:"not null"`
	// SecretEnc signs webhook bodies; it is encrypted like other app secrets.
	SecretEnc string `gorm:"not null;default:''"`
	Frequency string `gorm:"not null"`
	Hour      int    `gorm:"not null;default:0"`
	Minute    int    `gorm:"not null;default:0"`
	Weekday   int    `gorm:"not null;default:0"`
	Timezone  string `gorm:"not null;default:'UTC'"`
	Enabled   bool   `gorm:"not null;default:true"`
	// NextRunAt is when the scheduler sends next; moved past a run before it starts, so a crash never repeats it.
	NextRunAt           time.Time `gorm:"index;not null"`
	LastRunAt           *time.Time
	LastStatus          string     `gorm:"not null;default:''"`
	LastError           string     `gorm:"not null;default:''"`
	ConsecutiveFailures int        `gorm:"not null;default:0"`
	CreatedAt           *time.Time `gorm:"autoCreateTime"`
}

// DashboardSubscriptionRun is one delivery attempt, kept for the history list.
type DashboardSubscriptionRun struct {
	ID             uint      `gorm:"primaryKey,autoIncrement"`
	SubscriptionID uint      `gorm:"index;not null"`
	StartedAt      time.Time `gorm:"not null"`
	FinishedAt     time.Time `gorm:"not null"`
	Status         string    `gorm:"not null"`
	Error          string    `gorm:"not null;default:''"`
	Reports        int       `gorm:"not null;default:0"`
	Manual         bool      `gorm:"not null;default:false"`
}

// SmtpSettings is the instance's one outgoing mail account for subscriptions (row id 1).
type SmtpSettings struct {
	ID          uint   `gorm:"primaryKey"`
	Host        string `gorm:"not null;default:''"`
	Port        int    `gorm:"not null;default:587"`
	Username    string `gorm:"not null;default:''"`
	PasswordEnc string `gorm:"not null;default:''"`
	FromAddress string `gorm:"not null;default:''"`
	// Security is "starttls", "tls" (implicit, usually port 465) or "none".
	Security string `gorm:"not null;default:'starttls'"`
}
