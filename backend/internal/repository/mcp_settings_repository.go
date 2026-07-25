package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type IMcpSettingsRepo interface {
	FindByOwner(ctx context.Context, ownerID string) (*model.McpSettings, error)
	FindByTokenHash(ctx context.Context, tokenHash string) (*model.McpSettings, error)
	Upsert(ctx context.Context, settings *model.McpSettings) (*model.McpSettings, error)
}

type McpSettingsRepo struct {
	db *gorm.DB
}

func NewMcpSettingsRepo() IMcpSettingsRepo {
	return &McpSettingsRepo{db: container.Instance().DB()}
}

func (r *McpSettingsRepo) FindByOwner(ctx context.Context, ownerID string) (*model.McpSettings, error) {
	var settings model.McpSettings
	err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).First(&settings).Error
	if err == gorm.ErrRecordNotFound {
		return &model.McpSettings{OwnerID: ownerID, Port: 5001}, nil
	}
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *McpSettingsRepo) FindByTokenHash(ctx context.Context, tokenHash string) (*model.McpSettings, error) {
	var settings model.McpSettings
	err := r.db.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&settings).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *McpSettingsRepo) Upsert(ctx context.Context, settings *model.McpSettings) (*model.McpSettings, error) {
	existing, err := r.FindByOwner(ctx, settings.OwnerID)
	if err != nil {
		return nil, err
	}
	if existing.ID == 0 {
		if err := r.db.WithContext(ctx).Create(settings).Error; err != nil {
			return nil, err
		}
		return settings, nil
	}
	settings.ID = existing.ID
	if err := r.db.WithContext(ctx).Save(settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}
