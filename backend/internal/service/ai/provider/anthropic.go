package serviceAiProvider

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func NewAnthropicProvider(ctx context.Context, provider *model.AiProvider) (IAiProvider, error) {
	if provider.ApiKey == nil || *provider.ApiKey == "" || provider.Url == "" {
		return nil, fmt.Errorf("anthropic api key and url are required")
	}

	return &BaseProvider{
		context: ctx,
		client: openai.NewClient(
			option.WithAPIKey(*provider.ApiKey),
			option.WithBaseURL(provider.Url),
			option.WithRequestTimeout(time.Duration(provider.Timeout)*time.Second),
		),
	}, nil
}
