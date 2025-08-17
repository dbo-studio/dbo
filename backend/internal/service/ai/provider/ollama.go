package serviceAiProvider

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3/client"
)

type OllamaProvider struct {
	*BaseProvider
}

func NewOllamaProvider(provider *model.AiProvider) IAIProvider {
	return &OllamaProvider{
		BaseProvider: NewBaseProvider(provider),
	}
}

func (p *OllamaProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
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
		"stream":   false,
	}

	options := make(map[string]interface{})
	if req.Temperature != nil {
		options["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		options["num_predict"] = *req.MaxTokens
	}
	if len(options) > 0 {
		payload["options"] = options
	}

	resp, err := p.GetHttpClient().Post(p.url+"/api/chat", client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d, body: %s", resp.StatusCode(), string(resp.Body())))
	}

	var response struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	return &ChatResponse{
		Message: dto.AiMessage{
			Role:    response.Message.Role,
			Content: response.Message.Content,
		},
	}, nil
}

func (p *OllamaProvider) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	prompt := p.buildCompletionPrompt(req)

	payload := map[string]interface{}{
		"model":  req.Model,
		"prompt": prompt,
		"stream": false,
	}

	options := make(map[string]interface{})
	if req.Temperature != nil {
		options["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		options["num_predict"] = *req.MaxTokens
	}
	if len(options) > 0 {
		payload["options"] = options
	}

	resp, err := p.GetHttpClient().Post(p.url+"/api/generate", client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d", resp.StatusCode()))
	}

	var response struct {
		Response string `json:"response"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	return &CompletionResponse{
		Completion: response.Response,
	}, nil
}
