package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type JobRepository struct {
	db *gorm.DB
}

func NewJobRepo(db *gorm.DB) IJobRepo {
	return &JobRepository{
		db: db,
	}
}

func (r JobRepository) Create(ctx context.Context, job *model.Job) error {
	return r.db.WithContext(ctx).Create(job).Error
}

func (r JobRepository) Find(ctx context.Context, id int32) (*model.Job, error) {
	var job model.Job

	result := r.db.WithContext(ctx).Where("id = ?", id).First(&job)

	return &job, result.Error
}

func (r JobRepository) FindByOwner(ctx context.Context, id int32, ownerID string) (*model.Job, error) {
	var job model.Job

	result := r.db.WithContext(ctx).Where("id = ? AND owner_id = ?", id, ownerID).First(&job)

	return &job, result.Error
}

func (r JobRepository) Update(ctx context.Context, job *model.Job) error {
	return r.db.WithContext(ctx).Save(job).Error
}

func (r JobRepository) GetPendingJobs(ctx context.Context) ([]model.Job, error) {
	var jobs []model.Job

	err := r.db.WithContext(ctx).Where("status = ?", model.JobStatusPending).Order("created_at ASC").Find(&jobs).Error

	return jobs, err
}

func (r JobRepository) GetRunningJobs(ctx context.Context) ([]model.Job, error) {
	var jobs []model.Job

	err := r.db.WithContext(ctx).Where("status = ?", model.JobStatusRunning).Find(&jobs).Error

	return jobs, err
}

func (r JobRepository) DeleteOldJobs(ctx context.Context, days int) error {
	return r.db.WithContext(ctx).Where("created_at < DATE_SUB(NOW(), INTERVAL ? DAY)", days).Delete(&model.Job{}).Error
}

// ClaimNextPending claims the oldest pending job by selecting a candidate and
// flipping it to running with a conditional UPDATE. Proceeding only on
// RowsAffected==1 makes double dispatch impossible even when two workers race.
func (r JobRepository) ClaimNextPending(ctx context.Context) (*model.Job, error) {
	var job model.Job

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("status = ?", model.JobStatusPending).
			Order("created_at ASC").
			First(&job).Error; err != nil {
			return err
		}

		now := time.Now()

		result := tx.Model(&model.Job{}).
			Where("id = ? AND status = ?", job.ID, model.JobStatusPending).
			Updates(map[string]any{
				"status":     model.JobStatusRunning,
				"message":    "Job started",
				"started_at": &now,
			})
		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected != 1 {
			return gorm.ErrRecordNotFound
		}

		job.Status = model.JobStatusRunning
		job.Message = "Job started"
		job.StartedAt = &now

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &job, nil
}

func (r JobRepository) UpdateFields(ctx context.Context, id uint, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&model.Job{}).
		Where("id = ?", id).
		Updates(fields).Error
}

func (r JobRepository) UpdateProgress(ctx context.Context, id uint, progress int, message string) error {
	return r.db.WithContext(ctx).Model(&model.Job{}).
		Where("id = ?", id).
		Updates(map[string]any{"progress": progress, "message": message}).Error
}
