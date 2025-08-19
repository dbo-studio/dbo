package serviceAiProvider

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3/client"
	"github.com/samber/lo"
)

type OllamaProvider struct {
	*BaseProvider
}

func NewOllamaProvider(provider *model.AiProvider) IAiProvider {
	provider.ApiKey = lo.ToPtr("-")
	return &OllamaProvider{
		BaseProvider: NewBaseProvider(provider),
	}
}

func (p *OllamaProvider) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	if req == nil {
		return nil, apperror.BadRequest(fmt.Errorf("request cannot be nil"))
	}

	if req.Model == "" {
		return nil, apperror.BadRequest(fmt.Errorf("model is required"))
	}

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

	var aiResponse struct {
		Contents []AiMessageContent `json:"contents"`
	}

	if err := json.Unmarshal([]byte(rawResp.Message.Content), &aiResponse); err == nil && len(aiResponse.Contents) > 0 {
		contents := make([]model.AiChatMessageContent, len(aiResponse.Contents))
		for i, content := range aiResponse.Contents {
			contents[i] = model.AiChatMessageContent{
				Type:     content.Type,
				Content:  content.Content,
				Language: content.Language,
			}
		}

		return &ChatResponse{
			Role:     model.AiChatMessageRole(rawResp.Message.Role),
			Content:  rawResp.Message.Content,
			Type:     aiResponse.Contents[0].Type,
			Language: aiResponse.Contents[0].Language,
			Contents: contents,
		}, nil
	}

	// Fallback: try to parse as single content format
	var aiMsg AiMessageContent
	if err := json.Unmarshal([]byte(rawResp.Message.Content), &aiMsg); err != nil {
		aiMsg = AiMessageContent{
			Type:    model.AiChatMessageTypeExplanation,
			Content: strings.TrimSpace(rawResp.Message.Content),
		}
	}

	return &ChatResponse{
		Role:     model.AiChatMessageRole(rawResp.Message.Role),
		Content:  aiMsg.Content,
		Type:     aiMsg.Type,
		Language: aiMsg.Language,
	}, nil
}

func (p *OllamaProvider) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
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
