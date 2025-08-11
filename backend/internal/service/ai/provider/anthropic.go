package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3/client"
)

type AnthropicProvider struct {
	timeout int
	url     string
	apiKey  string
}

func NewAnthropicProvider(provider *model.AiProvider) IAIProvider {
	url := "https://api.anthropic.com"

	return &AnthropicProvider{
		timeout: 30,
		url:     url,
		apiKey:  provider.ApiKey,
	}
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
		Role string `json:"role"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if len(response.Content) == 0 {
		return &ChatResponse{
			Message: dto.AiMessage{Role: "assistant", Content: ""},
		}, nil
	}

	var content strings.Builder
	for _, item := range response.Content {
		if item.Type == "text" {
			content.WriteString(item.Text)
		}
	}

	return &ChatResponse{
		Message: dto.AiMessage{
			Role:    response.Role,
			Content: content.String(),
		},
	}, nil
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

func (p *AnthropicProvider) convertRole(role string) string {
	switch role {
	case "system":
		return "user"
	case "assistant":
		return "assistant"
	default:
		return "user"
	}
}

func (p *AnthropicProvider) buildCompletionPrompt(req *CompletionRequest) string {
	var sb strings.Builder

	sb.WriteString("You are a code autocomplete engine. Use the provided DB context when helpful.\n\n")

	if req.Language != nil && *req.Language != "" {
		sb.WriteString("Language: " + *req.Language + "\n")
	}

	if req.Context != "" {
		sb.WriteString("Context:\n" + req.Context + "\n\n")
	}

	sb.WriteString("Prefix:\n" + req.Prompt + "\n\n")

	if req.Suffix != nil && *req.Suffix != "" {
		sb.WriteString("Suffix:\n" + *req.Suffix + "\n\n")
	}

	sb.WriteString("Continue the code only, no explanations.")

	return sb.String()
}

func (p *AnthropicProvider) GetHttpClient() *client.Client {
	cc := client.New()
	cc.SetTimeout(time.Duration(p.timeout) * time.Second)
	cc.AddHeader("Content-Type", "application/json")

	if p.apiKey != "" {
		cc.AddHeader("Authorization", "Bearer "+p.apiKey)
	}

	return cc
}
