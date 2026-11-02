package serviceAiProvider

import (
	"context"
	"errors"
	"net/url"
	"strings"

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
	// Models reads the provider's model list with the values being edited, which also tests the connection.
	Models(ctx context.Context, id uint, req *dto.AiProviderModelsRequest) (*dto.AiProviderModelsResponse, error)
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
		return nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
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

	if err := validateActivation(aiProvider, dto); err != nil {
		return nil, apperror.Validation(err)
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

func (i *IAiProviderServiceImpl) Models(ctx context.Context, id uint, req *dto.AiProviderModelsRequest) (*dto.AiProviderModelsResponse, error) {
	if err := helper.RequirePermission(ctx, helper.PermAiSettings); err != nil {
		return nil, err
	}

	stored, err := i.aiProviderRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiProviderNotFound)
	}

	// Test with what is on the form; what it leaves out comes from the saved provider.
	candidate := *stored
	if req.URL != nil {
		candidate.URL = *req.URL
	}

	if req.APIKey != nil && !isMaskedAPIKey(*req.APIKey) {
		candidate.APIKey = req.APIKey
	}

	if req.Timeout != nil {
		candidate.Timeout = *req.Timeout
	}

	if u, err := url.Parse(candidate.URL); err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, apperror.BadRequest(apperror.ErrInvalidProviderURL)
	}

	// A failure is an answer, not an error: the form shows it next to the field.
	models, listErr := aiProvider.ListModels(ctx, &candidate)
	if listErr != nil {
		return &dto.AiProviderModelsResponse{Models: []string{}, Error: listErr.Error()}, nil //nolint:nilerr // the failure is the answer
	}

	return &dto.AiProviderModelsResponse{Models: models}, nil
}

// validateActivation refuses to make a provider the active one when it could
// not answer: every provider but Ollama needs an API key.
func validateActivation(provider *model.AiProvider, req *dto.AiProviderUpdateRequest) error {
	if req.IsActive == nil || !*req.IsActive || provider.Type == model.AIProviderTypeOllama {
		return nil
	}

	key := provider.APIKey
	if req.APIKey != nil {
		key = req.APIKey
	}

	if key == nil || strings.TrimSpace(*key) == "" {
		return errors.New("apiKey: an API key is required")
	}

	return nil
}
