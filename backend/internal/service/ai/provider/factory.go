package serviceAiProvider

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type ProviderFactory struct {
	logger logger.Logger
}

func NewProviderFactory(logger logger.Logger) *ProviderFactory {
	return &ProviderFactory{
		logger: logger,
	}
}

func (f *ProviderFactory) CreateProvider(provider *model.AiProvider) (IAiProvider, error) {
	switch provider.Type {
	case model.AIProviderTypeOpenAI:
		return NewOpenAIProvider(provider, f.logger), nil
	case model.AIProviderTypeAnthropic:
		return NewAnthropicProvider(provider, f.logger), nil
	case model.AIProviderTypeGemini:
		return NewGeminiProvider(provider, f.logger), nil
	case model.AIProviderTypeGroq:
		return NewGroqProvider(provider, f.logger), nil
	case model.AIProviderTypeOllama:
		return NewOllamaProvider(provider, f.logger), nil
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", provider.Type)
	}
}
