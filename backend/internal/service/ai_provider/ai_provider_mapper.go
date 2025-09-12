package serviceAiProvider

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

func aiProviderDetailModelToResponse(aiProvider *model.AiProvider) *dto.AiProviderDetailResponse {
	return &dto.AiProviderDetailResponse{
		AiProvider: aiProviderModelToDto(aiProvider),
	}
}

func aiProviderListModelToResponse(aiProviders *[]model.AiProvider) *dto.AiProviderListResponse {
	data := make([]dto.AiProvider, 0)
	for _, aiProvider := range *aiProviders {
		data = append(data, aiProviderModelToDto(&aiProvider))
	}

	return &dto.AiProviderListResponse{
		Items: data,
	}
}

func aiProviderModelToDto(aiProvider *model.AiProvider) dto.AiProvider {
	if len(aiProvider.Models) == 0 {
		aiProvider.Models = make([]string, 0)
	}

	return dto.AiProvider{
		ID:         aiProvider.ID,
		Type:       string(aiProvider.Type),
		Url:        aiProvider.Url,
		ApiKey:     aiProvider.ApiKey,
		Timeout:    aiProvider.Timeout,
		Models:     aiProvider.Models,
		Model:      aiProvider.Model,
		IsActive:   aiProvider.IsActive,
		LastUsedAt: aiProvider.LastUsedAt.Format("2006-01-02 15:04:05"),
	}
}
