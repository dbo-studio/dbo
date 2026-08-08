package serviceAiProvider

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

type AiProviderConfig struct {
	Type     model.AIProviderType
	URL      string
	Models   []string
	Model    string
	IsActive bool
	Timeout  int
}

var configs = []AiProviderConfig{
	{
		Type:     model.AIProviderTypeOpenAI,
		URL:      "https://api.openai.com/v1",
		Models:   []string{"gpt-5", "gpt-4o"},
		Model:    "gpt-5",
		IsActive: true,
		Timeout:  30,
	},
	{
		Type:     model.AIProviderTypeAnthropic,
		URL:      "https://api.anthropic.com/v1",
		Models:   []string{"claude-3-5-sonnet"},
		Model:    "claude-3-5-sonnet",
		IsActive: false,
		Timeout:  30,
	},
	{
		Type:     model.AIProviderTypeGemini,
		URL:      "https://generativelanguage.googleapis.com/v1beta/openai",
		Models:   []string{"gemini-2.0-flash"},
		Model:    "gemini-2.0-flash",
		IsActive: false,
		Timeout:  30,
	},
	{
		Type:     model.AIProviderTypeGroq,
		URL:      "https://api.x.ai/v1",
		Models:   []string{"grok-4"},
		Model:    "grok-4",
		IsActive: false,
		Timeout:  30,
	},
	{
		Type:     model.AIProviderTypeOllama,
		URL:      "http://localhost:11434/v1",
		Models:   []string{"llama3.1"},
		Model:    "llama3.1",
		IsActive: false,
		Timeout:  60,
	},
}

func (i *IAiProviderServiceImpl) Index(ctx context.Context) (*dto.AiProviderListResponse, error) {
	result, err := i.aiProviderRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	if len(result) < len(configs) {
		for _, config := range configs {
			provider := &model.AiProvider{
				Type:       config.Type,
				URL:        config.URL,
				Models:     config.Models,
				Timeout:    config.Timeout,
				Model:      config.Model,
				IsActive:   config.IsActive,
				LastUsedAt: time.Now(),
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
