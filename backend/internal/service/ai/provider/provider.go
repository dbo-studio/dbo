package serviceAiProvider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
)

type IAiProvider interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)
	Validate() bool
}

type ChatRequest struct {
	Messages    []model.AiChatMessage `json:"messages"`
	Model       string                `json:"model"`
	Temperature *float32              `json:"temperature,omitempty"`
	MaxTokens   *int                  `json:"max_tokens,omitempty"`
	Context     string                `json:"context,omitempty"`
	Query       string                `json:"query,omitempty"`
}

type ChatResponse struct {
	Role     model.AiChatMessageRole      `json:"role"`
	Content  string                       `json:"content"`
	Type     model.AiChatMessageType      `json:"type"`
	Language model.AiChatMessageLanguage  `json:"language"`
	Contents []model.AiChatMessageContent `json:"contents,omitempty"`
}

type CompletionRequest struct {
	Prompt      string   `json:"prompt"`
	Suffix      *string  `json:"suffix,omitempty"`
	Model       string   `json:"model"`
	Temperature *float32 `json:"temperature,omitempty"`
	MaxTokens   *int     `json:"max_tokens,omitempty"`
	Context     string   `json:"context,omitempty"`
}

type CompletionResponse struct {
	Completion string `json:"completion"`
}

type AiMessageResponse struct {
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	Done bool `json:"done"`
}

type AiMessageContent struct {
	Type     model.AiChatMessageType      `json:"type"`
	Content  string                       `json:"content"`
	Language *model.AiChatMessageLanguage `json:"language,omitempty"`
}
