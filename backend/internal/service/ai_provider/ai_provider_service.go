package serviceAiProvider

import (
	"context"
	"net/url"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

type IAiProviderService interface {
	Index(ctx context.Context) (*dto.AiProviderListResponse, error)
	Find(ctx context.Context, id uint) (*dto.AiProviderDetailResponse, error)
	Update(ctx context.Context, id uint, dto *dto.AiProviderUpdateRequest) (*dto.AiProviderDetailResponse, error)
}

type IAiProviderServiceImpl struct {
	aiProviderRepo  repository.IAiProviderRepo
	providerFactory *aiProvider.ProviderFactory
}

func NewAiProviderService(aiProviderRepo repository.IAiProviderRepo) IAiProviderService {
	return &IAiProviderServiceImpl{
		aiProviderRepo:  aiProviderRepo,
		providerFactory: aiProvider.NewProviderFactory(),
	}
}

func (i *IAiProviderServiceImpl) Find(ctx context.Context, id uint) (*dto.AiProviderDetailResponse, error) {
	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}

func (i *IAiProviderServiceImpl) Update(ctx context.Context, id uint, dto *dto.AiProviderUpdateRequest) (*dto.AiProviderDetailResponse, error) {
	if err := helper.RequirePermission(ctx, helper.PermAiSettings); err != nil {
		return nil, err
	}

	if dto.URL != nil && *dto.URL != "" {
		u, err := url.Parse(*dto.URL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			return nil, apperror.BadRequest(apperror.ErrInvalidProviderURL)
		}
	}

	// The client echoes back the masked key from the list response; treat it
	// as "keep the stored key".
	if dto.APIKey != nil && isMaskedAPIKey(*dto.APIKey) {
		dto.APIKey = nil
	}

	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
	}

	applyDefaultModel(aiProvider, dto)

	aiProvider, err = i.aiProviderRepo.Update(ctx, aiProvider, dto)
	if err != nil {
		return nil, err
	}

	err = i.aiProviderRepo.MakeAllProvidersNotActive(ctx, aiProvider, dto)
	if err != nil {
		return nil, err
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}

func applyDefaultModel(provider *model.AiProvider, req *dto.AiProviderUpdateRequest) {
	models := provider.Models
	if req.Models != nil {
		models = *req.Models
	}

	if len(models) == 0 {
		return
	}

	modelName := provider.Model
	if req.Model != nil {
		modelName = *req.Model
	}

	for _, item := range models {
		if item == modelName {
			return
		}
	}

	req.Model = &models[0]
}
