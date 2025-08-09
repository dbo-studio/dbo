package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type IAIProviderRepoImpl struct {
	db *gorm.DB
}

func NewAIProviderRepo(db *gorm.DB) IAIProviderRepo {
	return &IAIProviderRepoImpl{db: db}
}

func (r *IAIProviderRepoImpl) Index(ctx context.Context) ([]model.AIProvider, error) {
	var items []model.AIProvider
	return items, r.db.WithContext(ctx).Order("id desc").Find(&items).Error
}

func (r *IAIProviderRepoImpl) Find(ctx context.Context, id uint) (*model.AIProvider, error) {
	var item model.AIProvider
	return &item, r.db.WithContext(ctx).First(&item, id).Error
}

func (r *IAIProviderRepoImpl) Create(ctx context.Context, dto *dto.AIProviderCreateRequest) (*model.AIProvider, error) {
	var model = &model.AIProvider{
		Name:        dto.Name,
		Type:        model.AIProviderType(dto.Type),
		Url:         dto.Url,
		ApiKey:      dto.ApiKey,
		Model:       dto.Model,
		Temperature: helper.OptionalAndEmpty(lo.ToPtr(dto.Temperature), lo.ToPtr(float32(0.2))),
		MaxTokens:   helper.OptionalAndEmpty(lo.ToPtr(dto.MaxTokens), lo.ToPtr(512)),
	}

	result := r.db.WithContext(ctx).Create(model)

	return model, result.Error
}

func (r *IAIProviderRepoImpl) Update(ctx context.Context, provider *model.AIProvider, dto *dto.AIProviderUpdateRequest) (*model.AIProvider, error) {
	provider.Name = helper.OptionalString(dto.Name, provider.Name)
	provider.Type = model.AIProviderType(helper.OptionalString(dto.Type, string(provider.Type)))
	provider.Url = lo.FromPtr(helper.Optional(dto.Url, lo.ToPtr(provider.Url)))
	provider.ApiKey = lo.FromPtr(helper.Optional(dto.ApiKey, lo.ToPtr(provider.ApiKey)))
	provider.Model = lo.FromPtr(helper.Optional(dto.Model, lo.ToPtr(provider.Model)))
	provider.Temperature = helper.Optional(dto.Temperature, provider.Temperature)
	provider.MaxTokens = helper.Optional(dto.MaxTokens, provider.MaxTokens)

	result := r.db.WithContext(ctx).Save(provider)

	return provider, result.Error
}

func (r *IAIProviderRepoImpl) Delete(ctx context.Context, provider *model.AIProvider) error {
	return r.db.WithContext(ctx).Delete(provider).Error
}
