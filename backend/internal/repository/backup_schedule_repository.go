package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type BackupScheduleRepository struct {
	db *gorm.DB
}

func NewBackupScheduleRepo(db *gorm.DB) IBackupScheduleRepo {
	return &BackupScheduleRepository{db: db}
}

func (r BackupScheduleRepository) Create(ctx context.Context, schedule *model.BackupSchedule) error {
	return r.db.WithContext(ctx).Create(schedule).Error
}

func (r BackupScheduleRepository) FindByOwner(ctx context.Context, id uint, ownerID string) (*model.BackupSchedule, error) {
	var schedule model.BackupSchedule

	err := r.db.WithContext(ctx).Where("id = ? AND owner_id = ?", id, ownerID).First(&schedule).Error

	return &schedule, err
}

func (r BackupScheduleRepository) ListByOwner(ctx context.Context, ownerID string) ([]model.BackupSchedule, error) {
	var schedules []model.BackupSchedule

	err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).Order("id ASC").Find(&schedules).Error

	return schedules, err
}

func (r BackupScheduleRepository) ListDue(ctx context.Context, now time.Time) ([]model.BackupSchedule, error) {
	var schedules []model.BackupSchedule

	err := r.db.WithContext(ctx).
		Where("enabled = ? AND next_run_at IS NOT NULL AND next_run_at <= ?", true, now).
		Find(&schedules).Error

	return schedules, err
}

func (r BackupScheduleRepository) UpdateFields(ctx context.Context, id uint, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&model.BackupSchedule{}).Where("id = ?", id).Updates(fields).Error
}

func (r BackupScheduleRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.BackupSchedule{}, id).Error
}
