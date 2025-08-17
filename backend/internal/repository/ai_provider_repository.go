package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type AiProviderRepoImpl struct {
	db *gorm.DB
}

func NewAiProviderRepo(db *gorm.DB) IAiProviderRepo {
	return &AiProviderRepoImpl{db: db}
}

func (r AiProviderRepoImpl) Index(ctx context.Context) ([]model.AiProvider, error) {
	var items []model.AiProvider
	return items, r.db.WithContext(ctx).Order("id").Find(&items).Error
}

func (r AiProviderRepoImpl) Find(ctx context.Context, id uint) (*model.AiProvider, error) {
	var item model.AiProvider
	return &item, r.db.WithContext(ctx).First(&item, id).Error
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
	provider.Temperature = helper.Optional(dto.Temperature, provider.Temperature)
	provider.MaxTokens = helper.Optional(dto.MaxTokens, provider.MaxTokens)

	result := r.db.WithContext(ctx).Save(provider)

	return provider, result.Error
}
