package provider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
)

type GroqProvider struct {
	timeout int
	url     string
	apiKey  string
}

// NewGroqProvider ایجاد پروایدر Groq جدید
func NewGroqProvider(provider *model.AiProvider) IAIProvider {
	url := "https://api.groq.com/openai/v1"

	return &GroqProvider{
		timeout: 30,
		url:     url,
		apiKey:  provider.ApiKey,
	}
}

func (p *GroqProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	return nil, nil
}

func (p *GroqProvider) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	return nil, nil
}
