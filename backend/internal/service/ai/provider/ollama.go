package serviceAiProvider

import (
	"context"
	"fmt"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"

	"github.com/dbo-studio/dbo/internal/model"
)

func NewOllamaProvider(ctx context.Context, provider *model.AiProvider) (IAiProvider, error) {
	if provider.Url == "" {
		return nil, fmt.Errorf("ollama url is required")
	}

	return &BaseProvider{
		context: ctx,
		client: openai.NewClient(
			option.WithBaseURL(provider.Url),
			option.WithRequestTimeout(time.Duration(provider.Timeout)*time.Second),
		),
	}, nil
}
