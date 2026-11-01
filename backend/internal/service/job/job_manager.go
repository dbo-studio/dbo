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
	serviceEvents "github.com/dbo-studio/dbo/internal/service/events"
	serviceNotification "github.com/dbo-studio/dbo/internal/service/notification"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type IJobManager interface {
	RegisterProcessor(processor Processor)
	CreateJob(jobType model.JobType, ownerID string, data string) (*model.Job, error)
	UpdateJobProgress(ctx context.Context, job *model.Job, progress int, message string) error
	CancelRunning(jobID uint)
	// Announce tells the job's owner how it ended: an event for any end, and a notification for a finish or
	// a failure. Every writer of a terminal status calls it, so there is one path to the user.
	Announce(ctx context.Context, jobID uint)
	// RunWithHandover runs fn at once with a context that outlives the request, and waits up to opts.Wait for it.
	// When it ends in time its value is returned and no job exists. Otherwise a running job of opts.Type is
	// created, the request is answered with its id (jobID != 0), and the same run, never a second one, ends in
	// that job: result saved, status set, owner told.
	RunWithHandover(ctx context.Context, opts HandoverOptions, fn func(ctx context.Context) (any, error)) (value any, jobID uint, err error)
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
	hub          serviceEvents.IHub
	notifier     serviceNotification.INotifier
}

func NewJobManager(jobRepo repository.IJobRepo, appLogger logger.Logger, hub serviceEvents.IHub, notifier serviceNotification.INotifier) IJobManager {
	ctx, cancel := context.WithCancel(context.Background())

	jm := IJobManagerImpl{
		jobRepo:      jobRepo,
		processors:   make(map[model.JobType]Processor),
		cancels:      make(map[uint]context.CancelFunc),
		workerCtx:    ctx,
		workerCancel: cancel,
		logger:       appLogger,
		hub:          hub,
		notifier:     notifier,
	}

	jm.failStaleQueries()

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
	if err := jm.jobRepo.UpdateProgress(ctx, job.ID, progress, message); err != nil {
		return err
	}

	jm.hub.Publish(job.OwnerID, serviceEvents.Event{Type: "job.progress", Data: jobEvent{
		ID: job.ID, Type: job.Type, Status: model.JobStatusRunning, Progress: progress, Message: message,
	}})

	return nil
}

// jobEvent is what a stream sees of a job; the result payload stays in the database.
type jobEvent struct {
	ID       uint            `json:"id"`
	Type     model.JobType   `json:"type"`
	Status   model.JobStatus `json:"status"`
	Progress int             `json:"progress"`
	Message  string          `json:"message"`
	Error    string          `json:"error,omitempty"`
}

func (jm *IJobManagerImpl) Announce(ctx context.Context, jobID uint) {
	job, err := jm.jobRepo.Find(ctx, int32(jobID))
	if err != nil {
		jm.logger.Error(fmt.Sprintf("announce job %d: %v", jobID, err))

		return
	}

	event := "job." + string(job.Status)
	if job.Status != model.JobStatusCompleted && job.Status != model.JobStatusFailed && job.Status != model.JobStatusCancelled {
		return
	}

	jm.hub.Publish(job.OwnerID, serviceEvents.Event{Type: event, Data: jobEvent{
		ID: job.ID, Type: job.Type, Status: job.Status, Progress: job.Progress, Message: job.Message, Error: job.Error,
	}})

	// A cancel is the user's own act: it gets an event so screens update, but no entry in the inbox.
	if job.Status == model.JobStatusCancelled {
		return
	}

	kind, title, body := model.NotificationJobCompleted, jobLabel(job.Type)+" finished", ""
	if job.Status == model.JobStatusFailed {
		kind, title, body = model.NotificationJobFailed, jobLabel(job.Type)+" failed", job.Error
	}

	if len(body) > 300 {
		body = body[:300]
	}

	jobID = job.ID
	if err := jm.notifier.Notify(ctx, &model.Notification{
		OwnerID: job.OwnerID, Kind: kind, JobType: string(job.Type), Title: title, Body: body, JobID: &jobID,
	}); err != nil {
		jm.logger.Error(fmt.Sprintf("notify job %d: %v", jobID, err))
	}
}

func jobLabel(jobType model.JobType) string {
	switch jobType {
	case model.JobTypeImport:
		return "Import"
	case model.JobTypeExport:
		return "Export"
	default:
		return "Query"
	}
}

func (jm *IJobManagerImpl) markJobCompleted(ctx context.Context, jobID uint, message string) error {
	now := time.Now()

	return jm.jobRepo.UpdateFieldsIfRunning(ctx, jobID, map[string]any{
		"status":       model.JobStatusCompleted,
		"message":      message,
		"completed_at": &now,
	})
}

func (jm *IJobManagerImpl) markJobCancelled(ctx context.Context, jobID uint, message string) error {
	now := time.Now()

	return jm.jobRepo.UpdateFieldsIfActive(ctx, jobID, map[string]any{
		"status":       model.JobStatusCancelled,
		"message":      message,
		"completed_at": &now,
	})
}

func (jm *IJobManagerImpl) updateJobError(ctx context.Context, job *model.Job, errMsg string) error {
	now := time.Now()
	job.Error = errMsg
	job.Status = model.JobStatusFailed
	job.CompletedAt = &now

	return jm.jobRepo.UpdateFieldsIfRunning(ctx, job.ID, map[string]any{
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

		jm.Announce(jobCtx, job.ID)

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

	err = jm.jobRepo.UpdateFieldsIfRunning(jobCtx, job.ID, fields)
	if err != nil {
		return fmt.Errorf("failed to save job result: %w", err)
	}

	err = jm.markJobCompleted(jobCtx, job.ID, "Job completed successfully")
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	jm.Announce(jobCtx, job.ID)

	return nil
}

// HandoverOptions describes the job a slow request turns into.
type HandoverOptions struct {
	Type model.JobType
	// Data is what is needed to rebuild the work on screen (for a query: the request).
	Data string
	Wait time.Duration
}

type handoverOutcome struct {
	value any
	err   error
}

func (jm *IJobManagerImpl) RunWithHandover(ctx context.Context, opts HandoverOptions, fn func(ctx context.Context) (any, error)) (any, uint, error) {
	owner := helper.CtxOwnerID(ctx)
	// Derived from the manager's context so a shutdown stops the work; values copied from the request.
	runCtx, cancel := context.WithCancel(helper.CtxDetached(jm.workerCtx, ctx))
	outcome := make(chan handoverOutcome, 1) // buffered: a result landing during the handover is never lost

	go func() {
		defer func() {
			if r := recover(); r != nil {
				outcome <- handoverOutcome{err: fmt.Errorf("internal error: %v", r)}
			}
		}()

		value, err := fn(runCtx)
		outcome <- handoverOutcome{value: value, err: err}
	}()

	timer := time.NewTimer(opts.Wait)
	defer timer.Stop()

	select {
	case done := <-outcome:
		cancel()

		return done.value, 0, done.err
	case <-timer.C:
	}

	// It may have finished while the timer fired.
	select {
	case done := <-outcome:
		cancel()

		return done.value, 0, done.err
	default:
	}

	now := time.Now()
	job := &model.Job{
		Type: opts.Type, Status: model.JobStatusRunning, OwnerID: owner, Message: "Running in the background",
		Data: opts.Data, StartedAt: &now,
	}

	if err := jm.jobRepo.Create(jm.workerCtx, job); err != nil {
		// No job to hand over to: keep the request open for the answer.
		done := <-outcome
		cancel()

		return done.value, 0, done.err
	}

	jm.mu.Lock()
	jm.cancels[job.ID] = cancel
	jm.mu.Unlock()

	jm.workerWg.Add(1)

	go func() {
		defer jm.workerWg.Done()

		done := <-outcome

		jm.mu.Lock()
		delete(jm.cancels, job.ID)
		jm.mu.Unlock()
		cancel()

		jm.finishHandover(job, done)
	}()

	return nil, job.ID, nil
}

// finishHandover ends a handed-over job the way processJob ends a queued one.
func (jm *IJobManagerImpl) finishHandover(job *model.Job, done handoverOutcome) {
	// Writes must survive the shutdown that may have cancelled the work.
	ctx := context.WithoutCancel(jm.workerCtx)

	// A cancel by the user already set the status; it wins over whatever the driver reported.
	if fresh, err := jm.jobRepo.Find(ctx, int32(job.ID)); err == nil && fresh.Status == model.JobStatusCancelled {
		return
	}

	if done.err != nil {
		if err := jm.updateJobError(ctx, job, done.err.Error()); err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to update job error: %v", err))
		}

		jm.Announce(ctx, job.ID)

		return
	}

	job.Result.Data = done.value
	if err := jm.jobRepo.UpdateFieldsIfRunning(ctx, job.ID, map[string]any{"result": helper.StructToJSON(job.Result)}); err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to save job result: %v", err))
	}

	if err := jm.markJobCompleted(ctx, job.ID, "Job completed successfully"); err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to update job status: %v", err))
	}

	jm.Announce(ctx, job.ID)
}

// failStaleQueries ends background queries a crash or restart left running: their work is gone.
func (jm *IJobManagerImpl) failStaleQueries() {
	running, err := jm.jobRepo.GetRunningJobs(jm.workerCtx)
	if err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to look for stale queries: %v", err))

		return
	}

	for i := range running {
		if running[i].Type != model.JobTypeQuery {
			continue
		}

		if err := jm.updateJobError(jm.workerCtx, &running[i], "App restarted"); err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to end stale query %d: %v", running[i].ID, err))

			continue
		}

		jm.Announce(jm.workerCtx, running[i].ID)
	}
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

// runningQueue is the running jobs the single-run policy governs. A background query is not one of them: it
// would otherwise cancel, or block, an export that happens to be running.
func (jm *IJobManagerImpl) runningQueue() ([]model.Job, error) {
	running, err := jm.jobRepo.GetRunningJobs(jm.workerCtx)
	if err != nil {
		return nil, err
	}

	return lo.Reject(running, func(job model.Job, _ int) bool { return job.Type == model.JobTypeQuery }), nil
}

func (jm *IJobManagerImpl) processPendingJobs() {
	runningJobs, err := jm.runningQueue()
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
			_ = jm.markJobCancelled(jm.workerCtx, rj.ID, "Canceled due to single-run policy")
			jm.CancelRunning(rj.ID)
			jm.Announce(jm.workerCtx, rj.ID)
		}
	}

	runningJobs, err = jm.runningQueue()
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
				jm.Announce(jm.workerCtx, job.ID)
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
	bgCtx := context.WithoutCancel(jm.workerCtx)

	runningJobs, err := jm.jobRepo.GetRunningJobs(bgCtx)
	if err != nil {
		return fmt.Errorf("failed to get running jobs: %w", err)
	}

	for _, job := range runningJobs {
		err := jm.markJobCancelled(bgCtx, job.ID, "Canceled due to application shutdown")
		if err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to cancel job %d: %v", job.ID, err))
		} else {
			jm.logger.Info(fmt.Sprintf("Canceled job %d due to shutdown", job.ID))
		}
	}

	pendingJobs, err := jm.jobRepo.GetPendingJobs(bgCtx)
	if err != nil {
		return fmt.Errorf("failed to get pending jobs: %w", err)
	}

	for _, job := range pendingJobs {
		err := jm.markJobCancelled(bgCtx, job.ID, "Canceled due to application shutdown")
		if err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to cancel pending job %d: %v", job.ID, err))
		} else {
			jm.logger.Info(fmt.Sprintf("Canceled pending job %d due to shutdown", job.ID))
		}
	}

	return nil
}
