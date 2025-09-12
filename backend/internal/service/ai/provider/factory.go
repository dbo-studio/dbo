package serviceAiProvider

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/model"
)

type ProviderFactory struct {
}

func NewProviderFactory() *ProviderFactory {
	return &ProviderFactory{}
}

func (f *ProviderFactory) CreateProvider(ctx context.Context, provider *model.AiProvider) (IAiProvider, error) {
	switch provider.Type {
	case model.AIProviderTypeOpenAI:
		return NewOpenAIProvider(ctx, provider)
	case model.AIProviderTypeAnthropic:
		return NewAnthropicProvider(ctx, provider)
	case model.AIProviderTypeGemini:
		return NewGeminiProvider(ctx, provider)
	case model.AIProviderTypeGroq:
		return NewGroqProvider(ctx, provider)
	case model.AIProviderTypeOllama:
		return NewOllamaProvider(ctx, provider)
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", provider.Type)
	}
}
