package serviceBackup

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// ApplyRetention deletes a schedule's completed backups its limits no longer
// keep. The newest backup is always kept, so retention can never leave a
// schedule with nothing to restore.
func ApplyRetention(ctx context.Context, repo repository.IBackupArtifactRepo, remote Remote, schedule *model.BackupSchedule, now time.Time) error {
	if schedule.KeepLast == 0 && schedule.KeepDays == 0 && !schedule.KeepSmart {
		return nil
	}

	artifacts, err := repo.ListCompletedBySchedule(ctx, schedule.ID)
	if err != nil {
		return err
	}

	for _, a := range expiredBackups(artifacts, schedule, now) {
		if helper.IsReadableBackupPath(a.FilePath) {
			if err := os.Remove(a.FilePath); err != nil && !os.IsNotExist(err) {
				return err
			}
		}

		removeRemote(ctx, remote, a)

		if err := repo.Delete(ctx, a.ID); err != nil {
			return err
		}
	}

	return nil
}

// expiredBackups picks what to delete from artifacts, which come newest first.
// Smart retention keeps the newest backup of each day for a week, of each week
// for four weeks and of each month for a year; older ones go. A backup with no
// completion time is never expired.
func expiredBackups(artifacts []model.BackupArtifact, schedule *model.BackupSchedule, now time.Time) []model.BackupArtifact {
	var expired []model.BackupArtifact

	cutoff := now.AddDate(0, 0, -schedule.KeepDays)
	seen := map[string]bool{}

	for i, a := range artifacts {
		if a.CompletedAt == nil {
			continue
		}

		var drop bool

		if schedule.KeepSmart {
			key, ok := smartBucket(now.Sub(*a.CompletedAt))
			drop = i > 0 && (!ok || seen[key])
			seen[key] = true
		} else if i > 0 {
			drop = (schedule.KeepLast > 0 && i >= schedule.KeepLast) || (schedule.KeepDays > 0 && a.CompletedAt.Before(cutoff))
		}

		if drop {
			expired = append(expired, a)
		}
	}

	return expired
}

// smartBucket names the slot an age falls in; ok is false past a year.
func smartBucket(age time.Duration) (string, bool) {
	const day = 24 * time.Hour

	switch {
	case age < 7*day:
		return fmt.Sprintf("d%d", age/day), true
	case age < 28*day:
		return fmt.Sprintf("w%d", age/(7*day)), true
	case age < 365*day:
		return fmt.Sprintf("m%d", age/(30*day)), true
	}

	return "", false
}
