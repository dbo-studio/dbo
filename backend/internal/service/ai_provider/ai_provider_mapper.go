package serviceAiProvider

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

func aiProviderDetailModelToResponse(aiProvider *model.AIProvider) *dto.AIProviderDetailResponse {
	return &dto.AIProviderDetailResponse{
		AIProvider: aiProviderModelToDto(aiProvider),
	}
}

func aiProviderListModelToResponse(aiProviders *[]model.AIProvider) *dto.AIProviderListResponse {
	data := make([]dto.AIProvider, 0)
	for _, aiProvider := range *aiProviders {
		data = append(data, aiProviderModelToDto(&aiProvider))
	}

	return &dto.AIProviderListResponse{
		Items: data,
	}
}

func aiProviderModelToDto(aiProvider *model.AIProvider) dto.AIProvider {
	return dto.AIProvider{
		ID:          aiProvider.ID,
		Name:        aiProvider.Name,
		Type:        string(aiProvider.Type),
		Url:         aiProvider.Url,
		ApiKey:      aiProvider.ApiKey,
		Model:       aiProvider.Model,
		Temperature: aiProvider.Temperature,
		MaxTokens:   aiProvider.MaxTokens,
	}
}
