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

type OllamaProvider struct {
	timeout int
	url     string
	apiKey  *string
}

func NewOllamaProvider(provider *model.AiProvider) IAIProvider {
	url := "http://localhost:11434"
	if provider.Url != nil {
		url = strings.TrimRight(lo.FromPtr(provider.Url), "/")
	}

	return &OllamaProvider{
		timeout: 60,
		url:     url,
		apiKey:  provider.ApiKey,
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
			"role":    msg.Role,
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

	// پارس کردن پاسخ
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

func (p *OllamaProvider) buildCompletionPrompt(req *CompletionRequest) string {
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

func (p *OllamaProvider) GetHttpClient() *client.Client {
	cc := client.New()
	cc.SetTimeout(time.Duration(p.timeout) * time.Second)
	cc.AddHeader("Content-Type", "application/json")

	if p.apiKey != nil {
		cc.AddHeader("Authorization", "Bearer "+lo.FromPtr(p.apiKey))
	}

	return cc
}
