package aiProvider

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func NewOpenAIProvider(_ context.Context, provider *model.AiProvider) (IAiProvider, error) {
	if provider.URL == "" {
		return nil, fmt.Errorf("openai url is required")
	}

	options := []option.RequestOption{
		option.WithBaseURL(provider.URL),
		option.WithRequestTimeout(requestTimeout(provider.Timeout)),
	}
	if provider.APIKey != nil && *provider.APIKey != "" {
		options = append(options, option.WithAPIKey(*provider.APIKey))
	}

	return &BaseProvider{
		client: openai.NewClient(options...),
	}, nil
}
