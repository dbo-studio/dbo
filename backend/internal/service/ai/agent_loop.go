package serviceAi

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/goccy/go-json"
	"github.com/openai/openai-go/v2"
)

const (
	maxAskToolRounds   = 5
	maxAgentToolRounds = 10

	maxToolArgsLen   = 2000
	maxToolResultLen = 20000
)

const askModeInstructions = `Mode: ASK. You can inspect the schema and run read-only SELECT queries with tools. ` +
	`You cannot change the database. When the user wants a change, answer with the SQL in a code block for them to review and run themselves.`

const agentModeInstructions = `Mode: AGENT. Work step by step with tools. ` +
	`To design or change schema (create tables, add columns, add foreign keys) call propose_schema_change; the user reviews it on a diagram and applies it. ` +
	`To run INSERT/UPDATE/DELETE call execute_write; the user must confirm before it runs. ` +
	`Never claim a proposed change or write was applied — say it is waiting for the user's review.`

func modeInstructions(req *dto.AiChatRequest) string {
	if req.AgentMode() {
		return agentModeInstructions
	}

	return askModeInstructions
}

// runAgentLoop streams the model response, executing tool calls between
// rounds. It returns the final response plus the ordered tool/diff/permission
// traces to persist with the turn. Tool availability is enforced here, not
// only by the tool list sent to the model.
func (s *AiServiceImpl) runAgentLoop(
	ctx context.Context,
	provider aiProvider.IAiProvider,
	providerReq *aiProvider.ChatRequest,
	req *dto.AiChatRequest,
	emitEvent func(aiProvider.StreamEvent) error,
) (*aiProvider.ChatResponse, []model.AiChatMessage, error) {
	if s.toolRegistry == nil || len(providerReq.Tools) == 0 {
		resp, err := provider.StreamChat(ctx, providerReq, emitEvent)
		return resp, nil, err
	}

	toolCtx := serviceDbtools.ToolContext{ConnectionID: req.ConnectionID}
	if req.ContextOpts != nil {
		toolCtx.Schema = req.ContextOpts.Schema
		toolCtx.Database = req.ContextOpts.Database
	}

	maxRounds := maxAskToolRounds
	if req.AgentMode() {
		maxRounds = maxAgentToolRounds
	}

	var (
		finalResp *aiProvider.ChatResponse
		traces    []model.AiChatMessage
	)

	for round := 0; round < maxRounds; round++ {
		resp, toolCalls, err := provider.StreamChatWithTools(ctx, providerReq, emitEvent)
		if err != nil {
			return nil, traces, err
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
			if err := ctx.Err(); err != nil {
				return nil, traces, err
			}

			result, callTraces, err := s.runToolCall(ctx, req, call, toolCtx, emitEvent)
			traces = append(traces, callTraces...)

			if err != nil {
				return nil, traces, err
			}

			providerReq.ExtraMessages = append(providerReq.ExtraMessages,
				openai.ToolMessage(result, call.ID),
			)
		}

		if round == maxRounds-1 {
			finalResp = resp
		}
	}

	if finalResp == nil {
		return &aiProvider.ChatResponse{
			Role:     model.AiChatMessageRoleAssistant,
			Content:  "",
			Type:     model.AiChatMessageTypeExplanation,
			Language: model.AiChatMessageLanguageText,
		}, traces, nil
	}

	return finalResp, traces, nil
}

// runToolCall executes (or refuses) one tool call, streaming its card events.
// It returns the text fed back to the model and the traces to persist; the
// error is only non-nil when the stream itself failed (e.g. client gone).
func (s *AiServiceImpl) runToolCall(
	ctx context.Context,
	req *dto.AiChatRequest,
	call aiProvider.ToolCall,
	toolCtx serviceDbtools.ToolContext,
	emitEvent func(aiProvider.StreamEvent) error,
) (string, []model.AiChatMessage, error) {
	trace := ToolTrace{ID: call.ID, Name: call.Name, Args: truncate(call.Arguments, maxToolArgsLen)}
	started := time.Now()

	if err := emitEvent(aiProvider.StreamEvent{Type: "tool_start", ID: call.ID, Label: call.Name, Content: trace.Args}); err != nil {
		return "", nil, err
	}

	var (
		result string
		extra  *model.AiChatMessage
		event  *aiProvider.StreamEvent
		err    error
	)

	switch {
	case !serviceDbtools.AllowedTool(req.AgentMode(), call.Name):
		err = blockedError{fmt.Sprintf("tool %q is not available in %s mode", call.Name, modeName(req.Mode))}
	case call.Name == serviceDbtools.ToolProposeSchemaChange:
		var diff *DiagramDiffData
		if diff, err = s.proposeSchemaChange(ctx, call.Arguments, toolCtx); err == nil {
			result = fmt.Sprintf("Proposed %d schema change(s). They are shown to the user on the diagram for review and are NOT applied yet.", len(diff.Ops))
			msg := traceMessage(model.AiChatMessageTypeDiagramDiff, diff)
			ev := streamEvent("diagram_diff", diff.ChangesetID, diff)
			extra, event = &msg, &ev
		}
	case call.Name == serviceDbtools.ToolExecuteWrite:
		var permission *PermissionData
		if permission, err = requestWrite(call.Arguments, toolCtx); err == nil {
			result = "The statement is waiting for the user's confirmation and has NOT run yet."
			msg := traceMessage(model.AiChatMessageTypePermission, permission)
			ev := streamEvent("permission_request", permission.RequestID, permission)
			extra, event = &msg, &ev
		}
	default:
		args := map[string]any{}
		if call.Arguments != "" {
			_ = json.Unmarshal([]byte(call.Arguments), &args)
		}

		result, err = s.toolRegistry.Execute(ctx, call.Name, args, toolCtx)
	}

	trace.DurationMs = time.Since(started).Milliseconds()

	if err != nil {
		trace.Status = "error"
		trace.Error = err.Error()

		var data any

		if errors.Is(err, errToolBlocked) {
			trace.Status = "blocked"
			data = map[string]string{"code": "blocked", "reason": err.Error()}
		}

		result = err.Error()
		if emitErr := emitEvent(aiProvider.StreamEvent{
			Type: "tool_error", ID: call.ID, Label: call.Name, Content: trace.Error, DurationMs: trace.DurationMs, Data: data,
		}); emitErr != nil {
			return "", []model.AiChatMessage{traceMessage(model.AiChatMessageTypeTool, trace)}, emitErr
		}

		return result, []model.AiChatMessage{traceMessage(model.AiChatMessageTypeTool, trace)}, nil
	}

	trace.Status = "done"
	trace.Result = truncate(result, maxToolResultLen)

	traces := []model.AiChatMessage{traceMessage(model.AiChatMessageTypeTool, trace)}
	if extra != nil {
		traces = append(traces, *extra)
	}

	if emitErr := emitEvent(aiProvider.StreamEvent{
		Type: "tool_result", ID: call.ID, Label: call.Name, Content: trace.Result, DurationMs: trace.DurationMs,
	}); emitErr != nil {
		return "", traces, emitErr
	}

	if event != nil {
		if emitErr := emitEvent(*event); emitErr != nil {
			return "", traces, emitErr
		}
	}

	return result, traces, nil
}

func modeName(mode string) string {
	if mode == "" {
		return dto.AiChatModeAsk
	}

	return mode
}
