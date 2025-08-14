package serviceAiProvider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

type AiProviderConfig struct {
	Type model.AIProviderType
	Url string 
	Models []string
}

var configs = []AiProviderConfig{
	{
	Type: model.AIProviderTypeOpenAI,
	Url: "https://api.openai.com/v1",
	Models: []string{"gpt-5","gpt-4o"},
},
	{
	Type: model.AIProviderTypeAnthropic,
	Url: "https://api.anthropic.com/v1",
	Models: []string{"claude-3-5-sonnet-20240620"},
},
	{
	Type: model.AIProviderTypeGemini,
	Url: "https://api.gemini.com/v1",
	Models: []string{"gemini-2.0-flash-001"},
},
	{
	Type: model.AIProviderTypeGroq,
	Url: "https://api.groq.com/v1",
	Models: []string{"groq-3-7-sonnet-20240620"},
},
	{
	Type: model.AIProviderTypeOllama,
	Url: "http://localhost:11434",
	Models: []string{"llama3.1"},
},
}


func (i *IAiProviderServiceImpl) Index(ctx context.Context) (*dto.AiProviderListResponse, error) {
	result, err := i.aiProviderRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	if len(result) < len(configs){
		for _, config := range configs {
			provider := &model.AiProvider{
				Type: config.Type,
				Url:  &config.Url,
				Models: config.Models,
			}
			_, err := i.aiProviderRepo.CreateIfNotExists(ctx, provider)
			if err != nil {
				return nil, err
			}
		}
	}

	result, err = i.aiProviderRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	return aiProviderListModelToResponse(&result), nil
}
