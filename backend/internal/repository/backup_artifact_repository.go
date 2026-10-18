package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type BackupArtifactRepository struct {
	db *gorm.DB
}

func NewBackupArtifactRepo(db *gorm.DB) IBackupArtifactRepo {
	return &BackupArtifactRepository{db: db}
}

func (r BackupArtifactRepository) Create(ctx context.Context, artifact *model.BackupArtifact) error {
	return r.db.WithContext(ctx).Create(artifact).Error
}

func (r BackupArtifactRepository) FindByOwner(ctx context.Context, id uint, ownerID string) (*model.BackupArtifact, error) {
	var artifact model.BackupArtifact

	err := r.db.WithContext(ctx).Where("id = ? AND owner_id = ?", id, ownerID).First(&artifact).Error

	return &artifact, err
}

func (r BackupArtifactRepository) FindByJob(ctx context.Context, jobID uint, ownerID string) (*model.BackupArtifact, error) {
	var artifact model.BackupArtifact

	err := r.db.WithContext(ctx).Where("job_id = ? AND owner_id = ?", jobID, ownerID).First(&artifact).Error

	return &artifact, err
}

func (r BackupArtifactRepository) ListByOwner(ctx context.Context, ownerID string, connectionID *uint) ([]model.BackupArtifact, error) {
	var artifacts []model.BackupArtifact

	query := r.db.WithContext(ctx).Where("owner_id = ?", ownerID)
	if connectionID != nil {
		query = query.Where("connection_id = ?", *connectionID)
	}

	err := query.Order("id DESC").Find(&artifacts).Error

	return artifacts, err
}

func (r BackupArtifactRepository) UpdateFields(ctx context.Context, id uint, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&model.BackupArtifact{}).Where("id = ?", id).Updates(fields).Error
}

func (r BackupArtifactRepository) ListCompletedBySchedule(ctx context.Context, scheduleID uint) ([]model.BackupArtifact, error) {
	var artifacts []model.BackupArtifact

	err := r.db.WithContext(ctx).
		Where("schedule_id = ? AND status = ?", scheduleID, model.BackupStatusCompleted).
		Order("id DESC").Find(&artifacts).Error

	return artifacts, err
}

func (r BackupArtifactRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.BackupArtifact{}, id).Error
}
