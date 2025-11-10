package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type JobRepository struct {
	db *gorm.DB
}

func NewJobRepo() IJobRepo {
	return &JobRepository{
		db: container.Instance().DB(),
	}
}

func (r JobRepository) Create(ctx context.Context, job *model.Job) error {
	return r.db.Create(job).Error
}

func (r JobRepository) Find(ctx context.Context, id int32) (*model.Job, error) {
	var job model.Job

	result := r.db.WithContext(ctx).Where("id = ?", id).First(&job)

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
