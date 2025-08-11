package provider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type IAIProvider interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)
}

type ChatRequest struct {
	Messages    []dto.AiMessage `json:"messages"`
	Model       string          `json:"model"`
	Temperature *float32        `json:"temperature,omitempty"`
	MaxTokens   *int            `json:"max_tokens,omitempty"`
	Context     string          `json:"context,omitempty"`
}

type ChatResponse struct {
	Message dto.AiMessage `json:"message"`
}

type CompletionRequest struct {
	Prompt      string   `json:"prompt"`
	Suffix      *string  `json:"suffix,omitempty"`
	Language    *string  `json:"language,omitempty"`
	Model       string   `json:"model"`
	Temperature *float32 `json:"temperature,omitempty"`
	MaxTokens   *int     `json:"max_tokens,omitempty"`
	Context     string   `json:"context,omitempty"`
}

type CompletionResponse struct {
	Completion string `json:"completion"`
}
