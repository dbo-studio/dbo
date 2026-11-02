package serviceBackup

import (
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

const retryBaseDelay = 5 * time.Minute

// PlanRetry says when a failed scheduled run should be tried again: 5, 10, 20
// minutes and so on, up to RetryMax tries. It declines when tries are used up
// or the retry would land after the schedule's next regular slot, which then
// serves as the retry.
func PlanRetry(s *model.BackupSchedule, now time.Time) (time.Time, bool) {
	if s.RetryCount >= s.RetryMax {
		return time.Time{}, false
	}

	at := now.Add(retryBaseDelay << s.RetryCount)
	if s.NextRunAt != nil && !at.Before(*s.NextRunAt) {
		return time.Time{}, false
	}

	return at, true
}
