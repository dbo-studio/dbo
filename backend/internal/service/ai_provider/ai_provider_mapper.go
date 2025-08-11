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
	return dto.AiProvider{
		ID:          aiProvider.ID,
		Type:        string(aiProvider.Type),
		Url:         aiProvider.Url,
		ApiKey:      aiProvider.ApiKey,
		Model:       aiProvider.Model,
		Temperature: aiProvider.Temperature,
		MaxTokens:   aiProvider.MaxTokens,
	}
}
