package serviceAiProvider

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/gofiber/fiber/v3/client"
	"github.com/samber/lo"
)

type BaseProvider struct {
	timeout int
	url     string
	apiKey  *string
	logger  logger.Logger
}

func NewBaseProvider(provider *model.AiProvider, logger logger.Logger) *BaseProvider {
	url := strings.TrimRight(provider.Url, "/")

	return &BaseProvider{
		timeout: provider.Timeout,
		url:     url,
		apiKey:  provider.ApiKey,
		logger:  logger,
	}
}

func (p *BaseProvider) GetHttpClient() *client.Client {
	cc := client.New()
	cc.SetTimeout(time.Duration(p.timeout) * time.Second)
	cc.AddHeader("Content-Type", "application/json")

	if p.apiKey != nil {
		cc.AddHeader("Authorization", "Bearer "+lo.FromPtr(p.apiKey))
	}

	return cc
}

func (p *BaseProvider) buildCompletionPrompt(req *CompletionRequest) string {
	var sb strings.Builder

	sb.WriteString("You are an SQL completion assistant. ")
	sb.WriteString("Complete the SQL query with only the missing part. ")
	sb.WriteString("Return ONLY the completion text, no explanations, no JSON, no markdown. ")
	sb.WriteString("Just continue the SQL exactly where it left off.\n\n")

	if req.Context != "" {
		sb.WriteString("Context:\n" + req.Context + "\n\n")
	}

	sb.WriteString("Current SQL:\n" + req.Prompt + "\n\n")

	if req.Suffix != nil && *req.Suffix != "" {
		sb.WriteString("Suffix:\n" + *req.Suffix + "\n\n")
	}

	sb.WriteString("Complete the SQL query. Return ONLY the completion text:")

	return sb.String()
}

func (p *BaseProvider) buildChatPrompt(req *ChatRequest) string {
	var sb strings.Builder

	// restrictions
	sb.WriteString("You are an SQL and code assistant. ")
	sb.WriteString("You must ONLY answer programming-related or SQL-related questions. ")
	sb.WriteString("If the user asks anything outside these domains, respond with: ")
	sb.WriteString("\"❌ This question is outside my supported domain.\" \n\n")

	// rules for using the schema
	sb.WriteString("- Only use the schema provided below.\n")
	sb.WriteString("- If the user asks something that requires a column not listed in the schema, respond with:\n")
	sb.WriteString("\"⚠️ No column in schema can be used to answer this request.\"\n")
	sb.WriteString("- Do not invent columns or tables.\n")
	sb.WriteString("- Never reveal or explain the schema or context directly to the user.\n\n")

	// structured output format
	sb.WriteString("When generating a response, ALWAYS return a valid JSON object with this structure:\n\n")
	sb.WriteString("{\n")
	sb.WriteString("  \"contents\": [\n")
	sb.WriteString("    {\n")
	sb.WriteString("      \"type\": \"explanation\" | \"code\",\n")
	sb.WriteString("      \"content\": \"string\",\n")
	sb.WriteString("      \"language\": \"sql\" | \"go\" | \"js\" | \"python\" | \"json\" | \"yaml\" | \"text\" | null\n")
	sb.WriteString("    }\n")
	sb.WriteString("  ]\n")
	sb.WriteString("}\n\n")

	// main rules
	sb.WriteString("Rules:\n")
	sb.WriteString("1. You can include multiple content blocks in one response.\n")
	sb.WriteString("2. For SQL or code, use `\"type\": \"code\"` and specify the `\"language\"`.\n")
	sb.WriteString("3. For explanations, use `\"type\": \"explanation\"` and set `\"language\": null`.\n")
	sb.WriteString("4. Keep `\"content\"` clean: NO markdown fences (```), no extra formatting.\n")
	sb.WriteString("5. If you cannot answer due to schema limitations, use `\"type\": \"explanation\"` with a warning.\n")
	sb.WriteString("6. Never invent columns, tables, or other structures not present in the schema.\n")
	sb.WriteString("7. Never reveal, describe, or output the schema/context itself.\n")
	sb.WriteString("8. Explanations should be short and clear; code should be valid and executable.\n\n")
	sb.WriteString("9. ❗ You must ALWAYS return JSON. If the user says goodbye or anything irrelevant, still respond with a valid JSON object.\n\n")

	// real schema
	sb.WriteString("Schema:\n")
	sb.WriteString(req.Context)

	if req.Query != "" {
		sb.WriteString("\nCurrent Query:\n")
		sb.WriteString(req.Query)
		sb.WriteString("\n")
	}

	return sb.String()
}

func (p *BaseProvider) convertToStructuredResponse(content string, role model.AiChatMessageRole) (*ChatResponse, error) {
	var structuredResponse struct {
		Contents []AiMessageContent `json:"contents"`
	}

	re := regexp.MustCompile(`\\([^"\\/bfnrtu])`)
	clean := re.ReplaceAllString(content, "$1")
	contents := make([]model.AiChatMessageContent, len(structuredResponse.Contents))

	err := json.Unmarshal([]byte(clean), &structuredResponse)
	if err != nil {
		p.logger.Error(fmt.Sprintf("Failed to unmarshal JSON: %v, content: %s", err, content))
		contents = append(contents, model.AiChatMessageContent{
			Type:     "explanation",
			Content:  clean,
			Language: "text",
		})
	} else {
		for i, content := range structuredResponse.Contents {
			contents[i] = model.AiChatMessageContent{
				Type:     content.Type,
				Content:  content.Content,
				Language: content.Language,
			}
		}

	}

	return &ChatResponse{
		Role:     role,
		Content:  content,
		Type:     contents[0].Type,
		Language: contents[0].Language,
		Contents: contents,
	}, nil
}
