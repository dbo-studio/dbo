package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type AiProviderRepoImpl struct {
	db *gorm.DB
}

func NewAiProviderRepo() IAiProviderRepo {
	return &AiProviderRepoImpl{
		db: container.Instance().DB(),
	}
}

func (r AiProviderRepoImpl) Index(ctx context.Context) ([]model.AiProvider, error) {
	var items []model.AiProvider
	return items, r.db.WithContext(ctx).Order("id").Find(&items).Error
}

func (r AiProviderRepoImpl) Find(ctx context.Context, id uint) (*model.AiProvider, error) {
	var item model.AiProvider
	return &item, r.db.WithContext(ctx).First(&item, id).Error
}

func (r AiProviderRepoImpl) FindActive(ctx context.Context) (*model.AiProvider, error) {
	var item model.AiProvider
	return &item, r.db.WithContext(ctx).Where("is_active = ?", true).First(&item).Error
}

func (r AiProviderRepoImpl) CreateIfNotExists(ctx context.Context, provider *model.AiProvider) (*model.AiProvider, error) {
	existingProvider := &model.AiProvider{}
	result := r.db.WithContext(ctx).Where("type = ?", provider.Type).First(existingProvider)

	if result.Error != nil {
		result = r.db.WithContext(ctx).Create(provider)
	}

	return provider, result.Error
}

func (r AiProviderRepoImpl) Update(ctx context.Context, provider *model.AiProvider, dto *dto.AiProviderUpdateRequest) (*model.AiProvider, error) {
	provider.Url = lo.FromPtr(helper.Optional(dto.Url, lo.ToPtr(provider.Url)))
	provider.ApiKey = helper.Optional(dto.ApiKey, provider.ApiKey)
	provider.Timeout = lo.FromPtr(helper.Optional(dto.Timeout, lo.ToPtr(provider.Timeout)))
	provider.IsActive = lo.FromPtr(helper.Optional(dto.IsActive, lo.ToPtr(provider.IsActive)))
	provider.Model = lo.FromPtr(helper.Optional(dto.Model, lo.ToPtr(provider.Model)))

	if dto.Models != nil {
		provider.Models = lo.FromPtr(dto.Models)
	}

	result := r.db.WithContext(ctx).Save(provider)

	return provider, result.Error
}

func (c AiProviderRepoImpl) MakeAllProvidersNotActive(ctx context.Context, provider *model.AiProvider, req *dto.AiProviderUpdateRequest) error {
	if req.IsActive != nil && *req.IsActive {
		result := c.db.WithContext(ctx).Model(&model.AiProvider{}).Not("id", provider.ID).Update("is_active", false)
		return result.Error
	}
	return nil
}
