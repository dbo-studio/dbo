package serviceAiProvider

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func NewOllamaProvider(_ context.Context, provider *model.AiProvider) (IAiProvider, error) {
	if provider.URL == "" {
		return nil, fmt.Errorf("ollama url is required")
	}

	return &BaseProvider{
		client: openai.NewClient(
			option.WithBaseURL(provider.URL),
			option.WithRequestTimeout(requestTimeout(provider.Timeout)),
		),
	}, nil
}
