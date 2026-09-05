package serviceJob

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type IJobManager interface {
	RegisterProcessor(processor Processor)
	CreateJob(jobType model.JobType, ownerID string, data string) (*model.Job, error)
	UpdateJobProgress(ctx context.Context, job *model.Job, progress int, message string) error
	CancelRunning(jobID uint)
	Shutdown() error
	CancelAllJobs() error
}

type IJobManagerImpl struct {
	jobRepo    repository.IJobRepo
	processors map[model.JobType]Processor
	// cancels maps a running job ID to the context cancel that stops its
	// processor; guarded by mu.
	cancels      map[uint]context.CancelFunc
	workerCtx    context.Context
	workerCancel context.CancelFunc
	workerWg     sync.WaitGroup
	mu           sync.RWMutex
	logger       logger.Logger
}

func NewJobManager(jobRepo repository.IJobRepo, appLogger logger.Logger) IJobManager {
	ctx, cancel := context.WithCancel(context.Background())

	jm := IJobManagerImpl{
		jobRepo:      jobRepo,
		processors:   make(map[model.JobType]Processor),
		cancels:      make(map[uint]context.CancelFunc),
		workerCtx:    ctx,
		workerCancel: cancel,
		logger:       appLogger,
	}

	jm.workerWg.Add(1)
	go jm.worker()

	return &jm
}

func (jm *IJobManagerImpl) RegisterProcessor(processor Processor) {
	jm.mu.Lock()
	defer jm.mu.Unlock()

	jm.processors[processor.GetType()] = processor
}

func (jm *IJobManagerImpl) CreateJob(jobType model.JobType, ownerID string, data string) (*model.Job, error) {
	job := &model.Job{
		Type:     jobType,
		Status:   model.JobStatusPending,
		OwnerID:  ownerID,
		Progress: 0,
		Message:  "Job created",
		Data:     data,
	}

	err := jm.jobRepo.Create(jm.workerCtx, job)
	if err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}

	jm.logger.Info(fmt.Sprintf("Created job %d of type %s", job.ID, jobType))

	return job, nil
}

func (jm *IJobManagerImpl) UpdateJobProgress(ctx context.Context, job *model.Job, progress int, message string) error {
	// Column-scoped update: a progress tick from a stale in-memory copy must
	// never overwrite a status change (e.g. a concurrent user cancel).
	return jm.jobRepo.UpdateProgress(ctx, job.ID, progress, message)
}

func (jm *IJobManagerImpl) updateJobStatus(ctx context.Context, job *model.Job, status model.JobStatus, message string) error {
	fields := map[string]any{
		"status":  status,
		"message": message,
	}

	if status == model.JobStatusRunning && job.StartedAt == nil {
		now := time.Now()
		job.StartedAt = &now
		fields["started_at"] = &now
	}

	if status == model.JobStatusCompleted || status == model.JobStatusFailed || status == model.JobStatusCancelled {
		now := time.Now()
		job.CompletedAt = &now
		fields["completed_at"] = &now
	}

	return jm.jobRepo.UpdateFields(ctx, job.ID, fields)
}

func (jm *IJobManagerImpl) updateJobError(ctx context.Context, job *model.Job, errMsg string) error {
	now := time.Now()
	job.Error = errMsg
	job.Status = model.JobStatusFailed
	job.CompletedAt = &now

	return jm.jobRepo.UpdateFields(ctx, job.ID, map[string]any{
		"error":        errMsg,
		"status":       model.JobStatusFailed,
		"completed_at": &now,
	})
}

// isCancelled reports whether the job was canceled concurrently (either via
// the job context or directly in the DB).
func (jm *IJobManagerImpl) isCancelled(ctx context.Context, jobID uint) bool {
	if ctx.Err() != nil {
		return true
	}

	fresh, err := jm.jobRepo.Find(ctx, int32(jobID))

	return err == nil && fresh.Status == model.JobStatusCancelled
}

func (jm *IJobManagerImpl) processJob(job *model.Job) error {
	jm.mu.RLock()
	processor, exists := jm.processors[job.Type]
	jm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("no processor found for job type: %s", job.Type)
	}

	// The job is already running (ClaimNextPending flipped it atomically);
	// derive a cancellable context so user cancels reach the processor.
	jobCtx, cancel := context.WithCancel(jm.workerCtx)

	jm.mu.Lock()
	jm.cancels[job.ID] = cancel
	jm.mu.Unlock()

	defer func() {
		jm.mu.Lock()
		delete(jm.cancels, job.ID)
		jm.mu.Unlock()
		cancel()
	}()

	err := processor.Process(jobCtx, job)
	if err != nil {
		if jm.isCancelled(jobCtx, job.ID) {
			return nil
		}

		updateErr := jm.updateJobError(jobCtx, job, err.Error())
		if updateErr != nil {
			jm.logger.Error(fmt.Sprintf("Failed to update job error: %v", updateErr))
		}

		return fmt.Errorf("job processing failed: %w", err)
	}

	// A cancel landing while the processor ran wins over the terminal write.
	if jm.isCancelled(jobCtx, job.ID) {
		return nil
	}

	// Persist the processor's result payload alongside the terminal status:
	// column-scoped status updates never touch the result column. The JSON is
	// pre-marshaled because gorm's map updates bypass the field serializer.
	fields := map[string]any{"result": helper.StructToJSON(job.Result)}

	err = jm.jobRepo.UpdateFields(jobCtx, job.ID, fields)
	if err != nil {
		return fmt.Errorf("failed to save job result: %w", err)
	}

	err = jm.updateJobStatus(jobCtx, job, model.JobStatusCompleted, "Job completed successfully")
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	return nil
}

func (jm *IJobManagerImpl) worker() {
	defer jm.workerWg.Done()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-jm.workerCtx.Done():
			return
		case <-ticker.C:
			jm.processPendingJobs()
		}
	}
}

func (jm *IJobManagerImpl) processPendingJobs() {
	runningJobs, err := jm.jobRepo.GetRunningJobs(jm.workerCtx)
	if err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to get running jobs: %v", err))
		return
	}

	if len(runningJobs) > 1 {
		sort.Slice(runningJobs, func(i, j int) bool {
			var ti, tj time.Time
			if runningJobs[i].StartedAt != nil {
				ti = *runningJobs[i].StartedAt
			} else {
				ti = *runningJobs[i].CreatedAt
			}

			if runningJobs[j].StartedAt != nil {
				tj = *runningJobs[j].StartedAt
			} else {
				tj = *runningJobs[j].CreatedAt
			}

			return ti.After(tj)
		})

		for _, rj := range runningJobs[1:] {
			jobCopy := rj
			_ = jm.updateJobStatus(jm.workerCtx, &jobCopy, model.JobStatusCancelled, "Canceled due to single-run policy")
			jm.CancelRunning(rj.ID)
		}
	}

	runningJobs, err = jm.jobRepo.GetRunningJobs(jm.workerCtx)
	if err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to re-check running jobs: %v", err))
		return
	}

	if len(runningJobs) >= 1 {
		return
	}

	job, err := jm.jobRepo.ClaimNextPending(jm.workerCtx)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			jm.logger.Error(fmt.Sprintf("Failed to claim pending job: %v", err))
		}

		return
	}

	jm.workerWg.Add(1)

	go func() {
		defer jm.workerWg.Done()
		defer func() {
			if r := recover(); r != nil {
				jm.logger.Error(fmt.Sprintf("Panic processing job %d: %v", job.ID, r))
				_ = jm.updateJobError(jm.workerCtx, job, fmt.Sprintf("internal error: %v", r))
			}
		}()

		if err := jm.processJob(job); err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to process job %d: %v", job.ID, err))
		}
	}()
}

// CancelRunning aborts the processor of a running job via its context. The
// DB status is managed by the caller (JobService.Cancel).
func (jm *IJobManagerImpl) CancelRunning(jobID uint) {
	jm.mu.RLock()
	cancel, ok := jm.cancels[jobID]
	jm.mu.RUnlock()

	if ok {
		cancel()
	}
}

// Shutdown stops the worker loop, aborts all running processors and waits for
// them to finish, then flips any remaining running/pending jobs to canceled.
func (jm *IJobManagerImpl) Shutdown() error {
	jm.workerCancel()

	jm.mu.RLock()
	cancels := make([]context.CancelFunc, 0, len(jm.cancels))

	for _, cancel := range jm.cancels {
		cancels = append(cancels, cancel)
	}

	jm.mu.RUnlock()

	for _, cancel := range cancels {
		cancel()
	}

	jm.workerWg.Wait()

	return jm.CancelAllJobs()
}

func (jm *IJobManagerImpl) CancelAllJobs() error {
	runningJobs, err := jm.jobRepo.GetRunningJobs(jm.workerCtx)
	if err != nil {
		return fmt.Errorf("failed to get running jobs: %w", err)
	}

	for _, job := range runningJobs {
		err := jm.updateJobStatus(jm.workerCtx, &job, model.JobStatusCancelled, "Canceled due to application shutdown")
		if err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to cancel job %d: %v", job.ID, err))
		} else {
			jm.logger.Info(fmt.Sprintf("Canceled job %d due to shutdown", job.ID))
		}
	}

	pendingJobs, err := jm.jobRepo.GetPendingJobs(jm.workerCtx)
	if err != nil {
		return fmt.Errorf("failed to get pending jobs: %w", err)
	}

	for _, job := range pendingJobs {
		err := jm.updateJobStatus(jm.workerCtx, &job, model.JobStatusCancelled, "Canceled due to application shutdown")
		if err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to cancel pending job %d: %v", job.ID, err))
		} else {
			jm.logger.Info(fmt.Sprintf("Canceled pending job %d due to shutdown", job.ID))
		}
	}

	return nil
}
