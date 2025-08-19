package serviceAiProvider

import (
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/gofiber/fiber/v3/client"
	"github.com/samber/lo"
)

type BaseProvider struct {
	timeout int
	url     string
	apiKey  *string
}

func NewBaseProvider(provider *model.AiProvider) *BaseProvider {
	url := strings.TrimRight(provider.Url, "/")

	return &BaseProvider{
		timeout: provider.Timeout,
		url:     url,
		apiKey:  provider.ApiKey,
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

func (p *BaseProvider) GetURL() string {
	return p.url
}

func (p *BaseProvider) buildCompletionPrompt(req *CompletionRequest) string {
	var sb strings.Builder

	sb.WriteString(p.buildChatPrompt(&ChatRequest{
		Context: req.Context,
	}))

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

func (p *BaseProvider) buildChatPrompt(req *ChatRequest) string {
	var sb strings.Builder

	sb.WriteString("You are an SQL and code assistant.\n\n")
	sb.WriteString("- Only use the schema provided below.\n")
	sb.WriteString("- If the user asks something that requires a column not listed in the schema, respond with:\n")
	sb.WriteString("\"⚠️ No column in schema can be used to answer this request.\"\n")
	sb.WriteString("- Do not invent columns or tables.\n\n")
	sb.WriteString("When generating a response, you can return multiple content types. Use this JSON format:\n\n")
	sb.WriteString("{\n")
	sb.WriteString("  \"contents\": [\n")
	sb.WriteString("    {\n")
	sb.WriteString("      \"type\": \"explanation\" | \"code\",\n")
	sb.WriteString("      \"content\": \"string\",\n")
	sb.WriteString("      \"language\": \"sql\" | \"go\" | \"js\" | \"python\" | \"json\" | \"yaml\" | \"text\" | null\n")
	sb.WriteString("    }\n")
	sb.WriteString("  ]\n")
	sb.WriteString("}\n\n")
	sb.WriteString("Rules:\n")
	sb.WriteString("1. You can include multiple content blocks in one response.\n")
	sb.WriteString("2. For **SQL or code**, use `\"type\": \"code\"` and specify the `\"language\"`.\n")
	sb.WriteString("3. For **explanations**, use `\"type\": \"explanation\"` and `\"language\": null`.\n")
	sb.WriteString("4. Always keep `\"content\"` clean - no Markdown fences inside JSON.\n")
	sb.WriteString("5. If you cannot answer due to schema limitations, use `\"type\": \"explanation\"` with warning.\n")
	sb.WriteString("6. Never invent columns or tables; always stick to the schema.\n")
	sb.WriteString("7. You can mix explanation and code in the same response.\n\n")
	sb.WriteString("Schema:\n")
	sb.WriteString(req.Context)

	return sb.String()
}
