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

const startedPrompt = "You are an SQL generator. \nOnly use the schema provided below. \nIf the user asks something that requires a column not listed in the schema, \nrespond with: \"⚠️ No column in schema can be used to answer this request.\" \nDo not invent columns or tables.\n\n"

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

	sb.WriteString(startedPrompt)

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
