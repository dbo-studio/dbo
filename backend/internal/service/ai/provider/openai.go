package serviceAiProvider

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func NewOpenAIProvider(_ context.Context, provider *model.AiProvider) (IAiProvider, error) {
	if provider.APIKey == nil || *provider.APIKey == "" || provider.URL == "" {
		return nil, fmt.Errorf("openai api key and url are required")
	}

	return &BaseProvider{
		client: openai.NewClient(
			option.WithAPIKey(*provider.APIKey),
			option.WithBaseURL(provider.URL),
			option.WithRequestTimeout(time.Duration(provider.Timeout)*time.Second),
		),
	}, nil
}
