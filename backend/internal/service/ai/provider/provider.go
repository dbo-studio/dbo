package serviceAiProvider

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/dbo-studio/dbo/internal/model"
)

type IAiProvider interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)
}

type ChatRequest struct {
	Messages    []model.AiChatMessage `json:"messages"`
	Model       string                `json:"model"`
	Temperature *float32              `json:"temperature,omitempty"`
	MaxTokens   *int                  `json:"max_tokens,omitempty"`
	Context     string                `json:"context,omitempty"`
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
	Language    *string  `json:"language,omitempty"`
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
	Type     model.AiChatMessageType     `json:"type"`
	Content  string                      `json:"content"`
	Language model.AiChatMessageLanguage `json:"language,omitempty"`
}

// Helper function to convert simple content to structured response
func convertToStructuredResponse(content string, role model.AiChatMessageRole) *ChatResponse {
	// Try to parse as structured response first
	var structuredResponse struct {
		Contents []AiMessageContent `json:"contents"`
	}

	if err := json.Unmarshal([]byte(content), &structuredResponse); err == nil && len(structuredResponse.Contents) > 0 {
		// Convert to model types
		contents := make([]model.AiChatMessageContent, len(structuredResponse.Contents))
		for i, content := range structuredResponse.Contents {
			contents[i] = model.AiChatMessageContent{
				Type:     content.Type,
				Content:  content.Content,
				Language: content.Language,
			}
		}

		return &ChatResponse{
			Role:     role,
			Content:  content, // Keep original for backward compatibility
			Type:     contents[0].Type,
			Language: contents[0].Language,
			Contents: contents,
		}
	}

	// Fallback to simple content
	messageType := model.AiChatMessageTypeExplanation
	language := model.AiChatMessageLanguageText

	// Try to detect if it's code
	trimmedContent := strings.TrimSpace(content)
	if strings.Contains(strings.ToLower(trimmedContent), "select") ||
		strings.Contains(strings.ToLower(trimmedContent), "insert") ||
		strings.Contains(strings.ToLower(trimmedContent), "update") ||
		strings.Contains(strings.ToLower(trimmedContent), "delete") ||
		strings.Contains(strings.ToLower(trimmedContent), "create") {
		messageType = model.AiChatMessageTypeCode
		language = model.AiChatMessageLanguageSql
	}

	return &ChatResponse{
		Role:     role,
		Content:  content,
		Type:     messageType,
		Language: language,
	}
}
