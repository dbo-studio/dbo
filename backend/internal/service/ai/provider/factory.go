package provider

import (
	"fmt"

	"github.com/dbo-studio/dbo/internal/model"
)

type ProviderFactory struct{}

func NewProviderFactory() *ProviderFactory {
	return &ProviderFactory{}
}

func (f *ProviderFactory) CreateProvider(provider *model.AiProvider) (IAIProvider, error) {
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

func (f *ProviderFactory) GetDefaultModel(providerType model.AIProviderType) string {
	switch providerType {
	case model.AIProviderTypeOpenAI:
		return "gpt-3.5-turbo"
	case model.AIProviderTypeAnthropic:
		return "claude-3-haiku-20240307"
	case model.AIProviderTypeGemini:
		return "gemini-pro"
	case model.AIProviderTypeGroq:
		return "llama3-8b-8192"
	case model.AIProviderTypeOllama:
		return "llama2"
	default:
		return "gpt-3.5-turbo"
	}
}
