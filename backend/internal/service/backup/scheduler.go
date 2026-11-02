package serviceBackup

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
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
	logger    logger.Logger
}

func NewScheduler(schedules repository.IBackupScheduleRepo, jobs serviceJob.IJobManager, jobRepo repository.IJobRepo, appLogger logger.Logger) *Scheduler {
	return &Scheduler{schedules: schedules, jobs: jobs, jobRepo: jobRepo, logger: appLogger}
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
