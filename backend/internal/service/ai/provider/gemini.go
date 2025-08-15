package serviceAiProvider

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
	"github.com/samber/lo"
)

type GeminiProvider struct {
	timeout int
	url     string
	apiKey  *string
}

func NewGeminiProvider(provider *model.AiProvider) IAIProvider {
	url := "https://generativelanguage.googleapis.com"

	return &GeminiProvider{
		timeout: 30,
		url:     url,
		apiKey:  provider.ApiKey,
	}
}

func (p *GeminiProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	contents := make([]map[string]interface{}, 0, len(req.Messages)+1)

	if req.Context != "" {
		contents = append(contents, map[string]interface{}{
			"role": "user",
			"parts": []map[string]string{
				{"text": fmt.Sprintf("Context:\n%s", req.Context)},
			},
		})
		contents = append(contents, map[string]interface{}{
			"role": "model",
			"parts": []map[string]string{
				{"text": "I understand the context. How can I help you?"},
			},
		})
	}

	for _, msg := range req.Messages {
		role := p.convertRole(msg.Role)
		contents = append(contents, map[string]interface{}{
			"role": role,
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

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", p.url, req.Model, p.apiKey)

	resp, err := p.GetHttpClient().Post(url, client.Config{
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
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return &ChatResponse{
			Message: dto.AiMessage{Role: "assistant", Content: ""},
		}, nil
	}

	var content strings.Builder
	for _, part := range response.Candidates[0].Content.Parts {
		content.WriteString(part.Text)
	}

	return &ChatResponse{
		Message: dto.AiMessage{
			Role:    "assistant",
			Content: content.String(),
		},
	}, nil
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

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", p.url, req.Model, p.apiKey)

	resp, err := p.GetHttpClient().Post(url, client.Config{
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
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
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

func (p *GeminiProvider) convertRole(role string) string {
	switch role {
	case "assistant":
		return "model"
	default:
		return "user"
	}
}

func (p *GeminiProvider) buildCompletionPrompt(req *CompletionRequest) string {
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

func (p *GeminiProvider) GetHttpClient() *client.Client {
	cc := client.New()
	cc.SetTimeout(time.Duration(p.timeout) * time.Second)
	cc.AddHeader("Content-Type", "application/json")

	if p.apiKey != nil {
		cc.AddHeader("Authorization", "Bearer "+lo.FromPtr(p.apiKey))
	}

	return cc
}
