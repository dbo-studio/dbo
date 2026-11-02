package serviceBackup

import (
	"testing"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

func TestNextRunMonthly(t *testing.T) {
	s := &model.BackupSchedule{Cadence: model.ScheduleCadenceMonthly, MonthDay: 15, Hour: 2, Timezone: "UTC"}
	at := func(m time.Month, d, h int) time.Time { return time.Date(2026, m, d, h, 0, 0, 0, time.UTC) }

	cases := []struct{ from, want time.Time }{
		{at(time.March, 3, 0), at(time.March, 15, 2)},                            // later this month
		{at(time.March, 15, 3), at(time.April, 15, 2)},                           // today's slot already passed
		{at(time.December, 20, 0), time.Date(2027, 1, 15, 2, 0, 0, 0, time.UTC)}, // year rolls over
	}

	for _, c := range cases {
		got, err := NextRun(s, c.from)
		if err != nil || !got.Equal(c.want) {
			t.Errorf("from %v: got %v (%v), want %v", c.from, got, err, c.want)
		}
	}
}
