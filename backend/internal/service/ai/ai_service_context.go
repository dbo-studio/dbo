package serviceAi

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/samber/lo"
)

func buildProviderChatRequest(
	chat *model.AiChat,
	modelName string,
	contextStr string,
	req *dto.AiChatRequest,
	useMarkdown bool,
) *serviceAiProvider.ChatRequest {
	providerReq := &serviceAiProvider.ChatRequest{
		Messages:          chat.Messages,
		Model:             modelName,
		Context:           contextStr,
		UseMarkdownPrompt: useMarkdown,
	}

	if req.ContextOpts == nil {
		return providerReq
	}

	opts := req.ContextOpts
	if lo.FromPtr(opts.SelectedQuery) != "" {
		providerReq.SelectedQuery = lo.FromPtr(opts.SelectedQuery)
		providerReq.Query = lo.FromPtr(opts.SelectedQuery)
	} else {
		providerReq.Query = lo.FromPtr(opts.Query)
	}

	providerReq.QueryResultSummary = lo.FromPtr(opts.QueryResultSummary)
	providerReq.ObjectDefinition = lo.FromPtr(opts.ObjectDefinition)

	return providerReq
}
