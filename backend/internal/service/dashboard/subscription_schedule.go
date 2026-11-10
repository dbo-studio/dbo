package serviceDashboard

import (
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

// nextRun is the first time after `after` that a schedule fires, in the schedule's own time zone.
// Hourly fires at its minute of every hour, daily at hour:minute, weekly at hour:minute on its weekday.
func nextRun(sub *model.DashboardSubscription, after time.Time) time.Time {
	loc, err := time.LoadLocation(sub.Timezone)
	if err != nil {
		loc = time.UTC
	}

	local := after.In(loc)

	switch sub.Frequency {
	case model.SubscriptionHourly:
		next := time.Date(local.Year(), local.Month(), local.Day(), local.Hour(), sub.Minute, 0, 0, loc)
		for !next.After(after) {
			next = next.Add(time.Hour)
		}

		return next.UTC()
	default:
		// Day by day, so a day without that hour (a clock change) is skipped rather than shifted.
		for day := 0; day <= 8; day++ {
			d := local.AddDate(0, 0, day)

			next := time.Date(d.Year(), d.Month(), d.Day(), sub.Hour, sub.Minute, 0, 0, loc)
			if !next.After(after) || next.Hour() != sub.Hour {
				continue
			}

			if sub.Frequency == model.SubscriptionWeekly && int(next.Weekday()) != sub.Weekday {
				continue
			}

			return next.UTC()
		}

		return after.Add(24 * time.Hour).UTC()
	}
}
