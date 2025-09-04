package serviceAiProvider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IAiProviderService interface {
	Index(ctx context.Context) (*dto.AiProviderListResponse, error)
	Find(ctx context.Context, id uint) (*dto.AiProviderDetailResponse, error)
	Update(ctx context.Context, id uint, dto *dto.AiProviderUpdateRequest) (*dto.AiProviderDetailResponse, error)
}

type IAiProviderServiceImpl struct {
	aiProviderRepo  repository.IAiProviderRepo
	providerFactory *serviceAiProvider.ProviderFactory
}

func NewAiProviderService(aiProviderRepo repository.IAiProviderRepo) IAiProviderService {
	return &IAiProviderServiceImpl{
		aiProviderRepo:  aiProviderRepo,
		providerFactory: serviceAiProvider.NewProviderFactory(),
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
	aiProvider, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
	}

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
