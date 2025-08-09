package serviceAiProvider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IAiProviderService interface {
	Index(ctx context.Context) (*dto.AIProviderListResponse, error)
	Find(ctx context.Context, id uint) (*dto.AIProviderDetailResponse, error)
	Create(ctx context.Context, dto *dto.AIProviderCreateRequest) (*dto.AIProviderDetailResponse, error)
	Update(ctx context.Context, id uint, dto *dto.AIProviderUpdateRequest) (*dto.AIProviderDetailResponse, error)
	Delete(ctx context.Context, id uint) error
}

type IAiProviderServiceImpl struct {
	aiProviderRepo repository.IAIProviderRepo
}

func NewAiProviderService(aiProviderRepo repository.IAIProviderRepo) IAiProviderService {
	return &IAiProviderServiceImpl{aiProviderRepo: aiProviderRepo}
}

func (i *IAiProviderServiceImpl) Index(ctx context.Context) (*dto.AIProviderListResponse, error) {
	result, err := i.aiProviderRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	return aiProviderListModelToResponse(&result), nil
}

func (i *IAiProviderServiceImpl) Find(ctx context.Context, id uint) (*dto.AIProviderDetailResponse, error) {
	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}

func (i *IAiProviderServiceImpl) Create(ctx context.Context, dto *dto.AIProviderCreateRequest) (*dto.AIProviderDetailResponse, error) {
	aiProvider, err := i.aiProviderRepo.Create(ctx, dto)
	if err != nil {
		return nil, err
	}

	return aiProviderDetailModelToResponse(aiProvider), nil
}

func (i *IAiProviderServiceImpl) Update(ctx context.Context, id uint, dto *dto.AIProviderUpdateRequest) (*dto.AIProviderDetailResponse, error) {
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

func (i *IAiProviderServiceImpl) Delete(ctx context.Context, id uint) error {
	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return apperror.NotFound(apperror.ErrAIProviderNotFound)
	}

	err = i.aiProviderRepo.Delete(ctx, aiProvider)
	if err != nil {
		return err
	}

	return nil
}
