package serviceAiProvider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IAiProviderService interface {
	Index(ctx context.Context) (*dto.AiProviderListResponse, error)
	Find(ctx context.Context, id uint) (*dto.AiProviderDetailResponse, error)
	Create(ctx context.Context, dto *dto.AiProviderCreateRequest) (*dto.AiProviderDetailResponse, error)
	Update(ctx context.Context, id uint, dto *dto.AiProviderUpdateRequest) (*dto.AiProviderDetailResponse, error)
}

type IAiProviderServiceImpl struct {
	aiProviderRepo repository.IAiProviderRepo
}

func NewAiProviderService(aiProviderRepo repository.IAiProviderRepo) IAiProviderService {
	return &IAiProviderServiceImpl{aiProviderRepo: aiProviderRepo}
}

func (i *IAiProviderServiceImpl) Index(ctx context.Context) (*dto.AiProviderListResponse, error) {
	result, err := i.aiProviderRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	return aiProviderListModelToResponse(&result), nil
}

func (i *IAiProviderServiceImpl) Find(ctx context.Context, id uint) (*dto.AiProviderDetailResponse, error) {
	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}

func (i *IAiProviderServiceImpl) Create(ctx context.Context, dto *dto.AiProviderCreateRequest) (*dto.AiProviderDetailResponse, error) {
	aiProvider, err := i.aiProviderRepo.Create(ctx, dto)
	if err != nil {
		return nil, err
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}

func (i *IAiProviderServiceImpl) Update(ctx context.Context, id uint, dto *dto.AiProviderUpdateRequest) (*dto.AiProviderDetailResponse, error) {
	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAIProviderNotFound)
	}

	aiProvider, err = i.aiProviderRepo.Update(ctx, aiProvider, dto)
	if err != nil {
		return nil, err
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}
