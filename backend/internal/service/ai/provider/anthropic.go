package serviceAiProvider

import (
	"context"
	"fmt"
	"strings"

	"github.com/goccy/go-json"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3/client"
)

type AnthropicProvider struct {
	*BaseProvider
}

func NewAnthropicProvider(provider *model.AiProvider, logger logger.Logger) IAiProvider {
	return &AnthropicProvider{
		BaseProvider: NewBaseProvider(provider, logger),
	}
}

func (p *AnthropicProvider) Validate() bool {
	if p.apiKey == nil || *p.apiKey == "" || p.url == "" {
		return false
	}

	return true
}

func (p *AnthropicProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	messages := make([]map[string]string, 0, len(req.Messages))

	for _, msg := range req.Messages {
		messages = append(messages, map[string]string{
			"role":    p.convertRole(msg.Role),
			"content": msg.Content,
		})
	}

	payload := map[string]interface{}{
		"model":      req.Model,
		"max_tokens": 4096,
		"messages":   messages,
	}

	if req.Context != "" {
		payload["system"] = fmt.Sprintf("Context:\n%s", req.Context)
	}

	if req.Temperature != nil {
		payload["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		payload["max_tokens"] = *req.MaxTokens
	}

	resp, err := p.GetHttpClient().Post(p.url+"/v1/messages", client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d, body: %s", resp.StatusCode(), string(resp.Body())))
	}

	var response struct {
		Content []struct {
			Text string `json:"text"`
			Type string `json:"type"`
		} `json:"content"`
		Role  string `json:"role"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if len(response.Content) == 0 {
		return &ChatResponse{
			Role:    model.AiChatMessageRoleAssistant,
			Content: "",
		}, nil
	}

	var content strings.Builder
	for _, item := range response.Content {
		if item.Type == "text" {
			content.WriteString(item.Text)
		}
	}

	return p.convertToStructuredResponse(
		strings.TrimSpace(content.String()),
		model.AiChatMessageRole(response.Role),
	)
}

func (p *AnthropicProvider) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	prompt := p.buildCompletionPrompt(req)

	messages := []map[string]string{
		{"role": "user", "content": prompt},
	}

	payload := map[string]interface{}{
		"model":      req.Model,
		"max_tokens": 512,
		"messages":   messages,
		"system":     "Return only the continuation of the code. No explanations or additional text.",
	}

	if req.Temperature != nil {
		payload["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		payload["max_tokens"] = *req.MaxTokens
	}

	resp, err := p.GetHttpClient().Post(p.url+"/v1/messages", client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d", resp.StatusCode()))
	}

	var response struct {
		Content []struct {
			Text string `json:"text"`
			Type string `json:"type"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if len(response.Content) == 0 {
		return &CompletionResponse{Completion: ""}, nil
	}

	var content strings.Builder
	for _, item := range response.Content {
		if item.Type == "text" {
			content.WriteString(item.Text)
		}
	}

	return &CompletionResponse{
		Completion: content.String(),
	}, nil
}

func (p *AnthropicProvider) convertRole(role model.AiChatMessageRole) string {
	switch role {
	case model.AiChatMessageRoleSystem:
		return "system"
	case model.AiChatMessageRoleAssistant:
		return "assistant"
	default:
		return "user"
	}
}
