package serviceBackup

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceConnector "github.com/dbo-studio/dbo/internal/service/connector"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/logger"
)

const schedulerInterval = 30 * time.Second

// Scheduler queues backup jobs for due schedules while the DBO process runs.
// A schedule that came due while DBO was down runs once on the next tick, not
// once per missed slot.
type Scheduler struct {
	schedules repository.IBackupScheduleRepo
	jobs      serviceJob.IJobManager
	jobRepo   repository.IJobRepo
	conns     repository.IConnectionRepo
	remote    Remote
	logger    logger.Logger
}

func NewScheduler(schedules repository.IBackupScheduleRepo, jobs serviceJob.IJobManager, jobRepo repository.IJobRepo, conns repository.IConnectionRepo, remote Remote, appLogger logger.Logger) *Scheduler {
	return &Scheduler{schedules: schedules, jobs: jobs, jobRepo: jobRepo, conns: conns, remote: remote, logger: appLogger}
}

// Start runs until ctx is canceled.
func (s *Scheduler) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(schedulerInterval)
		defer ticker.Stop()

		s.Tick(ctx, time.Now())

		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				s.Tick(ctx, now)
			}
		}
	}()
}

// Tick queues every schedule that is due at now.
func (s *Scheduler) Tick(ctx context.Context, now time.Time) {
	due, err := s.schedules.ListDue(ctx, now)
	if err != nil {
		s.logger.Error(fmt.Errorf("backup scheduler: list due: %w", err))

		return
	}

	for i := range due {
		s.runOne(ctx, &due[i], now)
	}
}

func (s *Scheduler) runOne(ctx context.Context, schedule *model.BackupSchedule, now time.Time) {
	next, err := NextRun(schedule, now)
	if err != nil {
		s.logger.Error(fmt.Errorf("backup scheduler: schedule %d: %w", schedule.ID, err))

		// An unusable timezone would otherwise be retried every tick.
		_ = s.schedules.UpdateFields(ctx, schedule.ID, map[string]any{"enabled": false, "last_status": "failed", "last_error": err.Error()})

		return
	}

	s.reportMissed(ctx, schedule, now)

	// Advance first so a failure below cannot make the same slot fire again.
	if err := s.schedules.UpdateFields(ctx, schedule.ID, map[string]any{"next_run_at": next}); err != nil {
		s.logger.Error(fmt.Errorf("backup scheduler: schedule %d: %w", schedule.ID, err))

		return
	}

	if s.stillRunning(ctx, schedule) {
		return
	}

	if _, err := queueScheduledBackup(ctx, s.jobs, s.schedules, schedule); err != nil {
		s.logger.Error(fmt.Errorf("backup scheduler: schedule %d: %w", schedule.ID, err))
	}
}

// missedGrace is how late a slot may start before it counts as missed. A busy
// queue or a slow tick is not a miss; DBO being closed is.
const missedGrace = 10 * time.Minute

// reportMissed tells the schedule's channels that a slot passed while DBO was
// not running. The run still happens now, as a catch-up.
func (s *Scheduler) reportMissed(ctx context.Context, schedule *model.BackupSchedule, now time.Time) {
	if schedule.NextRunAt == nil || now.Sub(*schedule.NextRunAt) <= missedGrace {
		return
	}

	channels := schedule.Channels()
	if len(channels) == 0 || schedule.NotifyOn == "never" {
		return
	}

	name := ""
	if c, err := s.conns.FindByID(ctx, int32(schedule.ConnectionID)); err == nil {
		name = c.Name
	}

	s.remote.Notify(ctx, schedule.OwnerID, channels, serviceConnector.Event{
		Kind:       "backup",
		Name:       schedule.Name,
		Connection: name,
		Database:   schedule.Database,
		Failed:     true,
		Missed:     true,
		Error:      "The run planned for " + schedule.NextRunAt.Local().Format("2006-01-02 15:04") + " did not start because DBO was not running. It runs now instead.",
		At:         now,
	})
}

// stillRunning skips a slot while the previous run is unfinished, so a slow
// backup never stacks up copies of itself.
func (s *Scheduler) stillRunning(ctx context.Context, schedule *model.BackupSchedule) bool {
	if schedule.LastJobID == 0 {
		return false
	}

	job, err := s.jobRepo.Find(ctx, int32(schedule.LastJobID))
	if err != nil {
		return false
	}

	return job.Status == model.JobStatusPending || job.Status == model.JobStatusRunning
}
