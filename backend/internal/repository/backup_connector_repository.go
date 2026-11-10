package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type BackupConnectorRepository struct {
	db *gorm.DB
}

func NewBackupConnectorRepo(db *gorm.DB) IBackupConnectorRepo {
	return &BackupConnectorRepository{db: db}
}

func (r BackupConnectorRepository) Create(ctx context.Context, c *model.BackupConnector) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r BackupConnectorRepository) FindByOwner(ctx context.Context, id uint, ownerID string) (*model.BackupConnector, error) {
	var c model.BackupConnector

	err := r.db.WithContext(ctx).Where("id = ? AND owner_id = ?", id, ownerID).First(&c).Error

	return &c, err
}

func (r BackupConnectorRepository) ListByOwner(ctx context.Context, ownerID, kind string) ([]model.BackupConnector, error) {
	var list []model.BackupConnector

	err := r.db.WithContext(ctx).Where("owner_id = ? AND kind = ?", ownerID, kind).Order("id ASC").Find(&list).Error

	return list, err
}

func (r BackupConnectorRepository) UpdateFields(ctx context.Context, id uint, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&model.BackupConnector{}).Where("id = ?", id).Updates(fields).Error
}

func (r BackupConnectorRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.BackupConnector{}, id).Error
}
