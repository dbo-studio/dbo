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
	"github.com/samber/lo"
)

type OllamaProvider struct {
	*BaseProvider
}

func NewOllamaProvider(provider *model.AiProvider, logger logger.Logger) IAiProvider {
	provider.ApiKey = lo.ToPtr("-")
	return &OllamaProvider{
		BaseProvider: NewBaseProvider(provider, logger),
	}
}

func (p *OllamaProvider) Validate() bool {
	return p.url == ""
}

func (p *OllamaProvider) Chat(_ context.Context, req *ChatRequest) (*ChatResponse, error) {
	messages := make([]map[string]string, 0, len(req.Messages)+1)

	if req.Context != "" {
		systemPrompt := p.buildChatPrompt(req)

		messages = append(messages, map[string]string{
			"role":    "system",
			"content": systemPrompt,
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

	var rawResp AiMessageResponse
	if err := json.Unmarshal(resp.Body(), &rawResp); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if !rawResp.Done {
		return nil, apperror.InternalServerError(fmt.Errorf("incomplete response from Ollama"))
	}

	return p.convertToStructuredResponse(
		strings.TrimSpace(rawResp.Message.Content),
		model.AiChatMessageRole(rawResp.Message.Role),
	)
}

func (p *OllamaProvider) Complete(_ context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	if req == nil {
		return nil, apperror.BadRequest(fmt.Errorf("request cannot be nil"))
	}

	if req.Model == "" {
		return nil, apperror.BadRequest(fmt.Errorf("model is required"))
	}

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
		Done     bool   `json:"done"`
	}

	if err := json.Unmarshal(resp.Body(), &response); err != nil {
		return nil, apperror.InternalServerError(fmt.Errorf("failed to parse response: %v", err))
	}

	if !response.Done {
		return nil, apperror.InternalServerError(fmt.Errorf("incomplete response from Ollama"))
	}

	return &CompletionResponse{
		Completion: strings.TrimSpace(response.Response),
	}, nil
}
