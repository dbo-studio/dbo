package serviceAiProvider

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3/client"
)

type GeminiProvider struct {
	*BaseProvider
}

func NewGeminiProvider(provider *model.AiProvider) IAiProvider {
	return &GeminiProvider{
		BaseProvider: NewBaseProvider(provider),
	}
}

func (p *GeminiProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	contents := make([]map[string]interface{}, 0, len(req.Messages)+1)

	if req.Context != "" {
		contents = append(contents, map[string]interface{}{
			"role": "user",
			"parts": []map[string]string{
				{"text": fmt.Sprintf("Context:\n%s\n\nPlease use this context for the following conversation.", req.Context)},
			},
		})
	}

	for _, msg := range req.Messages {
		contents = append(contents, map[string]interface{}{
			"role": p.convertRole(msg.Role),
			"parts": []map[string]string{
				{"text": msg.Content},
			},
		})
	}

	payload := map[string]interface{}{
		"contents": contents,
	}

	generationConfig := make(map[string]interface{})
	if req.Temperature != nil {
		generationConfig["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		generationConfig["maxOutputTokens"] = *req.MaxTokens
	}
	if len(generationConfig) > 0 {
		payload["generationConfig"] = generationConfig
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", p.url, req.Model, *p.apiKey)

	httpClient := client.New()
	httpClient.SetTimeout(time.Duration(p.timeout) * time.Second)
	httpClient.AddHeader("Content-Type", "application/json")

	resp, err := httpClient.Post(url, client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d, body: %s", resp.StatusCode(), string(resp.Body())))
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
				Role string `json:"role"`
			} `json:"content"`
		} `json:"candidates"`
		PromptFeedback *struct {
			BlockReason string `json:"blockReason"`
		} `json:"promptFeedback,omitempty"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if response.PromptFeedback != nil && response.PromptFeedback.BlockReason != "" {
		return nil, apperror.BadRequest(fmt.Errorf("content blocked: %s", response.PromptFeedback.BlockReason))
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return &ChatResponse{
			Role:    model.AiChatMessageRoleAssistant,
			Content: "",
		}, nil
	}

	var content strings.Builder
	for _, part := range response.Candidates[0].Content.Parts {
		content.WriteString(part.Text)
	}

	return p.convertToStructuredResponse(
		strings.TrimSpace(content.String()),
		model.AiChatMessageRole(response.Candidates[0].Content.Role),
	)
}

func (p *GeminiProvider) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	prompt := p.buildCompletionPrompt(req)

	contents := []map[string]interface{}{
		{
			"role": "user",
			"parts": []map[string]string{
				{"text": prompt},
			},
		},
	}

	payload := map[string]interface{}{
		"contents": contents,
	}

	generationConfig := make(map[string]interface{})
	if req.Temperature != nil {
		generationConfig["temperature"] = *req.Temperature
	}
	if req.MaxTokens != nil {
		generationConfig["maxOutputTokens"] = *req.MaxTokens
	}
	if len(generationConfig) > 0 {
		payload["generationConfig"] = generationConfig
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", p.url, req.Model, *p.apiKey)

	// Create a new client without Authorization header for Gemini
	httpClient := client.New()
	httpClient.SetTimeout(time.Duration(p.timeout) * time.Second)
	httpClient.AddHeader("Content-Type", "application/json")

	resp, err := httpClient.Post(url, client.Config{
		Body: payload,
	})

	if err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("HTTP request failed: %v", err))
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return nil, apperror.InternalServerError(fmt.Errorf("API error: status %d", resp.StatusCode()))
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		PromptFeedback *struct {
			BlockReason string `json:"blockReason"`
		} `json:"promptFeedback,omitempty"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if response.PromptFeedback != nil && response.PromptFeedback.BlockReason != "" {
		return nil, apperror.BadRequest(fmt.Errorf("content blocked: %s", response.PromptFeedback.BlockReason))
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return &CompletionResponse{Completion: ""}, nil
	}

	var content strings.Builder
	for _, part := range response.Candidates[0].Content.Parts {
		content.WriteString(part.Text)
	}

	return &CompletionResponse{
		Completion: content.String(),
	}, nil
}

func (p *GeminiProvider) convertRole(role model.AiChatMessageRole) string {
	switch role {
	case model.AiChatMessageRoleAssistant:
		return "model"
	default:
		return "user"
	}
}
