package serviceAiProvider

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/model"
)

type ProviderFactory struct{}

func NewProviderFactory() *ProviderFactory {
	return &ProviderFactory{}
}

func (f *ProviderFactory) CreateProvider(provider *model.AiProvider) (IAiProvider, error) {
	switch provider.Type {
	case model.AIProviderTypeOpenAI:
		return NewOpenAIProvider(provider), nil
	case model.AIProviderTypeAnthropic:
		return NewAnthropicProvider(provider), nil
	case model.AIProviderTypeGemini:
		return NewGeminiProvider(provider), nil
	case model.AIProviderTypeGroq:
		return NewGroqProvider(provider), nil
	case model.AIProviderTypeOllama:
		return NewOllamaProvider(provider), nil
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", provider.Type)
	}
}
