package serviceBackup

import (
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

// NextRun returns the first run strictly after from, in the schedule's own
// timezone so a daily 02:00 stays at 02:00 across daylight-saving changes.
func NextRun(s *model.BackupSchedule, from time.Time) (time.Time, error) {
	loc, err := time.LoadLocation(s.Timezone)
	if err != nil {
		return time.Time{}, err
	}

	local := from.In(loc)

	var next time.Time

	switch s.Cadence {
	case model.ScheduleCadenceHourly:
		next = time.Date(local.Year(), local.Month(), local.Day(), local.Hour(), s.Minute, 0, 0, loc)
		if !next.After(local) {
			next = next.Add(time.Hour)
		}
	case model.ScheduleCadenceWeekly:
		next = time.Date(local.Year(), local.Month(), local.Day(), s.Hour, s.Minute, 0, 0, loc)
		next = next.AddDate(0, 0, (s.Weekday-int(next.Weekday())+7)%7)

		if !next.After(local) {
			next = next.AddDate(0, 0, 7)
		}
	default:
		next = time.Date(local.Year(), local.Month(), local.Day(), s.Hour, s.Minute, 0, 0, loc)
		if !next.After(local) {
			next = next.AddDate(0, 0, 1)
		}
	}

	return next.UTC(), nil
}
