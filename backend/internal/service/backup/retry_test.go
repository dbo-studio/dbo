package serviceBackup

import (
	"testing"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
)

func TestPlanRetry(t *testing.T) {
	now := time.Now()
	far := now.Add(24 * time.Hour)
	soon := now.Add(7 * time.Minute)

	cases := []struct {
		name string
		s    model.BackupSchedule
		want time.Duration // 0 = no retry
	}{
		{"disabled", model.BackupSchedule{NextRunAt: &far}, 0},
		{"first try", model.BackupSchedule{RetryMax: 2, NextRunAt: &far}, 5 * time.Minute},
		{"second try doubles", model.BackupSchedule{RetryMax: 2, RetryCount: 1, NextRunAt: &far}, 10 * time.Minute},
		{"tries used up", model.BackupSchedule{RetryMax: 2, RetryCount: 2, NextRunAt: &far}, 0},
		{"next slot comes first", model.BackupSchedule{RetryMax: 2, RetryCount: 1, NextRunAt: &soon}, 0},
	}

	for _, c := range cases {
		at, ok := PlanRetry(&c.s, now)
		if ok != (c.want != 0) || (ok && at.Sub(now) != c.want) {
			t.Errorf("%s: got %v %v, want %v", c.name, at.Sub(now), ok, c.want)
		}
	}
}
