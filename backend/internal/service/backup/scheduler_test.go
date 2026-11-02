package serviceBackup

import (
	"context"
	"testing"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceConnector "github.com/dbo-studio/dbo/internal/service/connector"
)

type notifyRecorder struct {
	Remote
	events []serviceConnector.Event
}

func (n *notifyRecorder) Notify(_ context.Context, _ string, _ []uint, e serviceConnector.Event) {
	n.events = append(n.events, e)
}

type nameOnlyConns struct{ repository.IConnectionRepo }

func (nameOnlyConns) FindByID(context.Context, int32) (*model.Connection, error) {
	return &model.Connection{Name: "prod"}, nil
}

func TestReportMissed(t *testing.T) {
	now := time.Now()
	due := func(late time.Duration) *time.Time { t := now.Add(-late); return &t }

	cases := []struct {
		name string
		s    model.BackupSchedule
		want int
	}{
		{"on time", model.BackupSchedule{NextRunAt: due(time.Minute), ChannelIDs: "[1]"}, 0},
		{"late", model.BackupSchedule{NextRunAt: due(2 * time.Hour), ChannelIDs: "[1]"}, 1},
		{"no channels", model.BackupSchedule{NextRunAt: due(2 * time.Hour), ChannelIDs: "[]"}, 0},
		{"muted", model.BackupSchedule{NextRunAt: due(2 * time.Hour), ChannelIDs: "[1]", NotifyOn: "never"}, 0},
	}

	for _, c := range cases {
		rec := &notifyRecorder{}
		(&Scheduler{conns: nameOnlyConns{}, remote: rec}).reportMissed(context.Background(), &c.s, now)

		if len(rec.events) != c.want {
			t.Errorf("%s: %d notifications, want %d", c.name, len(rec.events), c.want)
		}

		if c.want == 1 && (!rec.events[0].Missed || rec.events[0].Connection != "prod") {
			t.Errorf("%s: bad event %+v", c.name, rec.events[0])
		}
	}
}
