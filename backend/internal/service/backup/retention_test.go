package serviceBackup

import (
	"testing"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

func ago(now time.Time, d time.Duration) model.BackupArtifact {
	t := now.Add(-d)

	return model.BackupArtifact{CompletedAt: &t}
}

func TestExpiredBackupsSmart(t *testing.T) {
	now := time.Now()
	h := time.Hour
	day := 24 * h

	// newest first, as the repository returns them
	artifacts := []model.BackupArtifact{
		ago(now, 1*h),     // kept: newest
		ago(now, 2*h),     // dropped: same day as newest
		ago(now, 30*h),    // kept: day 1
		ago(now, 10*day),  // kept: week 1
		ago(now, 11*day),  // dropped: week 1 again
		ago(now, 60*day),  // kept: month 2
		ago(now, 400*day), // dropped: older than a year
	}

	got := expiredBackups(artifacts, &model.BackupSchedule{KeepSmart: true}, now)
	if len(got) != 3 {
		t.Fatalf("expired %d backups, want 3", len(got))
	}
}

func TestExpiredBackupsLimitsKeepNewest(t *testing.T) {
	now := time.Now()
	artifacts := []model.BackupArtifact{ago(now, 100*24*time.Hour), ago(now, 200*24*time.Hour)}

	got := expiredBackups(artifacts, &model.BackupSchedule{KeepDays: 1}, now)
	if len(got) != 1 {
		t.Fatalf("expired %d backups, want 1 (the newest must stay)", len(got))
	}
}
