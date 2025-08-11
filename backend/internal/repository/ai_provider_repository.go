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
	return items, r.db.WithContext(ctx).Order("id desc").Find(&items).Error
}

func (r AiProviderRepoImpl) Find(ctx context.Context, id uint) (*model.AiProvider, error) {
	var item model.AiProvider
	return &item, r.db.WithContext(ctx).First(&item, id).Error
}

func (r AiProviderRepoImpl) Create(ctx context.Context, dto *dto.AiProviderCreateRequest) (*model.AiProvider, error) {
	var provider = &model.AiProvider{
		Type:        model.AIProviderType(dto.Type),
		Url:         dto.Url,
		ApiKey:      dto.ApiKey,
		Model:       dto.Model,
		Temperature: helper.OptionalAndEmpty(dto.Temperature, lo.ToPtr(float32(0.2))),
		MaxTokens:   helper.OptionalAndEmpty(dto.MaxTokens, lo.ToPtr(512)),
	}

	result := r.db.WithContext(ctx).Create(provider)

	return provider, result.Error
}

func (r AiProviderRepoImpl) Update(ctx context.Context, provider *model.AiProvider, dto *dto.AiProviderUpdateRequest) (*model.AiProvider, error) {
	provider.Type = model.AIProviderType(helper.OptionalString(dto.Type, string(provider.Type)))
	provider.Url = helper.Optional(dto.Url, provider.Url)
	provider.ApiKey = lo.FromPtr(helper.Optional(dto.ApiKey, lo.ToPtr(provider.ApiKey)))
	provider.Model = helper.Optional(dto.Model, provider.Model)
	provider.Temperature = helper.Optional(dto.Temperature, provider.Temperature)
	provider.MaxTokens = helper.Optional(dto.MaxTokens, provider.MaxTokens)

	result := r.db.WithContext(ctx).Save(provider)

	return provider, result.Error
}
