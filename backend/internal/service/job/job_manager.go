package job

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type IJobManager interface {
	RegisterProcessor(processor JobProcessor)
	CreateJob(jobType model.JobType, data string) (*model.Job, error)
	UpdateJobProgress(job *model.Job, progress int, message string) error
	CancelAllJobs() error
}

type IJobManagerImpl struct {
	jobRepo      repository.IJobRepo
	processors   map[model.JobType]JobProcessor
	workerCtx    context.Context
	workerCancel context.CancelFunc
	workerWg     sync.WaitGroup
	mu           sync.RWMutex
	logger       logger.Logger
}

func NewJobManager(jobRepo repository.IJobRepo, logger logger.Logger) IJobManager {
	ctx, cancel := context.WithCancel(context.Background())

	jm := IJobManagerImpl{
		jobRepo:      jobRepo,
		processors:   make(map[model.JobType]JobProcessor),
		workerCtx:    ctx,
		workerCancel: cancel,
		logger:       logger,
	}

	jm.workerWg.Add(1)
	go jm.worker()

	return &jm
}

func (jm *IJobManagerImpl) RegisterProcessor(processor JobProcessor) {
	jm.mu.Lock()
	defer jm.mu.Unlock()
	jm.processors[processor.GetType()] = processor
}

func (jm *IJobManagerImpl) CreateJob(jobType model.JobType, data string) (*model.Job, error) {
	job := &model.Job{
		Type:     jobType,
		Status:   model.JobStatusPending,
		Progress: 0,
		Message:  "Job created",
		Data:     data,
	}

	err := jm.jobRepo.Create(context.Background(), job)
	if err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}

	jm.logger.Info(fmt.Sprintf("Created job %d of type %s", job.ID, jobType))
	return job, nil
}

func (jm *IJobManagerImpl) UpdateJobProgress(job *model.Job, progress int, message string) error {
	job.Progress = progress
	job.Message = message
	return jm.jobRepo.Update(context.Background(), job)
}

func (jm *IJobManagerImpl) updateJobStatus(job *model.Job, status model.JobStatus, message string) error {
	job.Status = status
	job.Message = message

	if status == model.JobStatusRunning && job.StartedAt == nil {
		now := time.Now()
		job.StartedAt = &now
	}

	if status == model.JobStatusCompleted || status == model.JobStatusFailed || status == model.JobStatusCancelled {
		now := time.Now()
		job.CompletedAt = &now
	}

	return jm.jobRepo.Update(context.Background(), job)
}

func (jm *IJobManagerImpl) updateJobError(job *model.Job, error string) error {
	job.Error = error
	job.Status = model.JobStatusFailed
	now := time.Now()
	job.CompletedAt = &now
	return jm.jobRepo.Update(context.Background(), job)
}

func (jm *IJobManagerImpl) processJob(job *model.Job) error {
	jm.mu.RLock()
	processor, exists := jm.processors[job.Type]
	jm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("no processor found for job type: %s", job.Type)
	}

	err := jm.updateJobStatus(job, model.JobStatusRunning, "Job started")
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	err = processor.Process(job)
	if err != nil {
		updateErr := jm.updateJobError(job, err.Error())
		if updateErr != nil {
			jm.logger.Error(fmt.Sprintf("Failed to update job error: %v", updateErr))
		}
		return fmt.Errorf("job processing failed: %w", err)
	}

	err = jm.updateJobStatus(job, model.JobStatusCompleted, "Job completed successfully")
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
	runningJobs, err := jm.jobRepo.GetRunningJobs(context.Background())
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
			_ = jm.updateJobStatus(&jobCopy, model.JobStatusCancelled, "Cancelled due to single-run policy")
		}
	}

	runningJobs, err = jm.jobRepo.GetRunningJobs(context.Background())
	if err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to re-check running jobs: %v", err))
		return
	}
	if len(runningJobs) >= 1 {
		return
	}

	jobs, err := jm.jobRepo.GetPendingJobs(context.Background())
	if err != nil {
		jm.logger.Error(fmt.Sprintf("Failed to get pending jobs: %v", err))
		return
	}
	if len(jobs) == 0 {
		return
	}

	j := jobs[0]
	go func(j model.Job) {
		if err := jm.processJob(&j); err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to process job %d: %v", j.ID, err))
		}
	}(j)
}

func (jm *IJobManagerImpl) CancelAllJobs() error {
	runningJobs, err := jm.jobRepo.GetRunningJobs(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get running jobs: %w", err)
	}

	for _, job := range runningJobs {
		err := jm.updateJobStatus(&job, model.JobStatusCancelled, "Cancelled due to application shutdown")
		if err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to cancel job %d: %v", job.ID, err))
		} else {
			jm.logger.Info(fmt.Sprintf("Cancelled job %d due to shutdown", job.ID))
		}
	}

	pendingJobs, err := jm.jobRepo.GetPendingJobs(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get pending jobs: %w", err)
	}

	for _, job := range pendingJobs {
		err := jm.updateJobStatus(&job, model.JobStatusCancelled, "Cancelled due to application shutdown")
		if err != nil {
			jm.logger.Error(fmt.Sprintf("Failed to cancel pending job %d: %v", job.ID, err))
		} else {
			jm.logger.Info(fmt.Sprintf("Cancelled pending job %d due to shutdown", job.ID))
		}
	}

	return nil
}
