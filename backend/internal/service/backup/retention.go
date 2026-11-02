package serviceBackup

import (
	"context"
	"os"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// ApplyRetention deletes a schedule's completed backups beyond its limits:
// anything past the newest KeepLast, and anything older than KeepDays. The
// newest backup is always kept, so retention can never leave a schedule with
// nothing to restore.
func ApplyRetention(ctx context.Context, repo repository.IBackupArtifactRepo, schedule *model.BackupSchedule, now time.Time) error {
	if schedule.KeepLast == 0 && schedule.KeepDays == 0 {
		return nil
	}

	artifacts, err := repo.ListCompletedBySchedule(ctx, schedule.ID)
	if err != nil {
		return err
	}

	cutoff := now.AddDate(0, 0, -schedule.KeepDays)

	for i, a := range artifacts {
		if i == 0 {
			continue
		}

		tooMany := schedule.KeepLast > 0 && i >= schedule.KeepLast
		tooOld := schedule.KeepDays > 0 && a.CompletedAt != nil && a.CompletedAt.Before(cutoff)

		if !tooMany && !tooOld {
			continue
		}

		if helper.IsReadableBackupPath(a.FilePath) {
			if err := os.Remove(a.FilePath); err != nil && !os.IsNotExist(err) {
				return err
			}
		}

		if err := repo.Delete(ctx, a.ID); err != nil {
			return err
		}
	}

	return nil
}
