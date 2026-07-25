package serviceAi

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/goccy/go-json"
	"github.com/openai/openai-go/v2"
)

const maxAgentToolRounds = 5

func (s *AiServiceImpl) runAgentLoop(
	ctx context.Context,
	provider serviceAiProvider.IAiProvider,
	providerReq *serviceAiProvider.ChatRequest,
	req *dto.AiChatRequest,
	emitEvent func(serviceAiProvider.StreamEvent) error,
) (*serviceAiProvider.ChatResponse, error) {
	if s.toolRegistry == nil || len(providerReq.Tools) == 0 {
		return provider.StreamChat(ctx, providerReq, emitEvent)
	}

	toolCtx := dbtools.ToolContext{ConnectionID: req.ConnectionID}
	if req.ContextOpts != nil {
		toolCtx.Schema = req.ContextOpts.Schema
		toolCtx.Database = req.ContextOpts.Database
	}

	var finalResp *serviceAiProvider.ChatResponse

	for round := 0; round < maxAgentToolRounds; round++ {
		resp, toolCalls, err := provider.StreamChatWithTools(ctx, providerReq, emitEvent)
		if err != nil {
			return nil, err
		}

		if len(toolCalls) == 0 {
			finalResp = resp
			break
		}

		assistantToolCalls := make([]openai.ChatCompletionMessageToolCallUnionParam, 0, len(toolCalls))
		for _, call := range toolCalls {
			assistantToolCalls = append(assistantToolCalls, openai.ChatCompletionMessageToolCallUnionParam{
				OfFunction: &openai.ChatCompletionMessageFunctionToolCallParam{
					ID:   call.ID,
					Type: "function",
					Function: openai.ChatCompletionMessageFunctionToolCallFunctionParam{
						Name:      call.Name,
						Arguments: call.Arguments,
					},
				},
			})
		}

		providerReq.ExtraMessages = append(providerReq.ExtraMessages, openai.ChatCompletionMessageParamUnion{
			OfAssistant: &openai.ChatCompletionAssistantMessageParam{
				ToolCalls: assistantToolCalls,
			},
		})

		for _, call := range toolCalls {
			if err := emitEvent(serviceAiProvider.StreamEvent{Type: "tool_start", Label: call.Name}); err != nil {
				return nil, err
			}

			args := map[string]any{}
			if call.Arguments != "" {
				_ = json.Unmarshal([]byte(call.Arguments), &args)
			}

			result, execErr := s.toolRegistry.Execute(ctx, call.Name, args, toolCtx)
			if execErr != nil {
				_ = emitEvent(serviceAiProvider.StreamEvent{
					Type:    "tool_error",
					Label:   call.Name,
					Content: execErr.Error(),
				})
				result = execErr.Error()
			} else {
				_ = emitEvent(serviceAiProvider.StreamEvent{
					Type:    "tool_result",
					Label:   call.Name,
					Content: result,
				})
			}

			providerReq.ExtraMessages = append(providerReq.ExtraMessages,
				openai.ToolMessage(result, call.ID),
			)
		}

		if round == maxAgentToolRounds-1 {
			finalResp = resp
		}
	}

	if finalResp == nil {
		return &serviceAiProvider.ChatResponse{
			Role:     model.AiChatMessageRoleAssistant,
			Content:  "",
			Type:     model.AiChatMessageTypeExplanation,
			Language: model.AiChatMessageLanguageText,
		}, nil
	}

	return finalResp, nil
}
