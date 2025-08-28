package serviceAiProvider

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3/client"
)

type OpenAIProvider struct {
	*BaseProvider
}

func NewOpenAIProvider(provider *model.AiProvider, logger logger.Logger) IAiProvider {
	return &OpenAIProvider{
		BaseProvider: NewBaseProvider(provider, logger),
	}
}

func (p *OpenAIProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	messages := make([]map[string]string, 0, len(req.Messages)+1)

	if req.Context != "" {
		messages = append(messages, map[string]string{
			"role":    "system",
			"content": fmt.Sprintf("Context:\n%s", req.Context),
		})
	}

	for _, msg := range req.Messages {
		messages = append(messages, map[string]string{
			"role":    string(msg.Role),
			"content": msg.Content,
		})
	}

	payload := map[string]interface{}{
		"model":    req.Model,
		"messages": messages,
	}

	if req.Temperature != nil {
		payload["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		payload["max_tokens"] = *req.MaxTokens
	}

	resp, err := p.GetHttpClient().Post(p.url+"/chat/completions", client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d, body: %s", resp.StatusCode(), string(resp.Body())))
	}

	var response struct {
		Choices []struct {
			Message struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if len(response.Choices) == 0 {
		return &ChatResponse{
			Role:    model.AiChatMessageRoleAssistant,
			Content: "",
		}, nil
	}

	return p.convertToStructuredResponse(
		strings.TrimSpace(response.Choices[0].Message.Content),
		model.AiChatMessageRole(response.Choices[0].Message.Role),
	)
}

func (p *OpenAIProvider) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	if completion, ok := p.tryCompletionsEndpoint(ctx, req); ok {
		return &CompletionResponse{Completion: completion}, nil
	}

	return p.completionViaChat(ctx, req)
}

func (p *OpenAIProvider) tryCompletionsEndpoint(ctx context.Context, req *CompletionRequest) (string, bool) {
	prompt := p.buildCompletionPrompt(req)

	payload := map[string]interface{}{
		"model":  req.Model,
		"prompt": prompt,
	}

	if req.Temperature != nil {
		payload["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		payload["max_tokens"] = *req.MaxTokens
	}

	resp, err := p.GetHttpClient().Post(p.url+"/completions", client.Config{
		Body: payload,
	})

	if err != nil {
		return "", false
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return "", false
	}

	var response struct {
		Choices []struct {
			Text string `json:"text"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return "", false
	}

	if len(response.Choices) == 0 {
		return "", false
	}

	return response.Choices[0].Text, true
}

func (p *OpenAIProvider) completionViaChat(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	prompt := p.buildCompletionPrompt(req)

	messages := []map[string]string{
		{"role": "system", "content": "Return only the continuation."},
		{"role": "user", "content": prompt},
	}

	payload := map[string]interface{}{
		"model":    req.Model,
		"messages": messages,
	}

	if req.Temperature != nil {
		payload["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		payload["max_tokens"] = *req.MaxTokens
	}

	resp, err := p.GetHttpClient().Post(p.url+"/chat/completions", client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d", resp.StatusCode()))
	}

	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if len(response.Choices) == 0 {
		return &CompletionResponse{Completion: ""}, nil
	}

	return &CompletionResponse{
		Completion: response.Choices[0].Message.Content,
	}, nil
}
