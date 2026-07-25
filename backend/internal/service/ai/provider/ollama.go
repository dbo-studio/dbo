package serviceAiProvider

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func NewOllamaProvider(ctx context.Context, provider *model.AiProvider) (IAiProvider, error) {
	if provider.URL == "" {
		return nil, fmt.Errorf("ollama url is required")
	}

	return &BaseProvider{
		context: ctx,
		client: openai.NewClient(
			option.WithBaseURL(provider.URL),
			option.WithRequestTimeout(time.Duration(provider.Timeout)*time.Second),
		),
	}, nil
}
