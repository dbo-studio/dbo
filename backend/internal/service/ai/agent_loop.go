package serviceAi

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
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
	`To explain why a query is slow, call explain_query and base any index advice on the plan. ` +
	`When asked to review or improve the schema, call review_schema. ` +
	`You cannot change the database. When the user wants a change, give the SQL in a code block for them to review and run, ` +
	`and say that Agent mode can prepare it as a change they review and apply.`

const agentModeInstructions = `Mode: AGENT. Work step by step with tools. ` +
	`To design or change schema (create databases and schemas, create, rename or drop tables, add/alter/rename/drop columns, add indexes, foreign keys and checks, drop constraints, create or drop views) call propose_schema_change; the user reviews it and applies it. ` +
	`Set NOT NULL with alter_column and UNIQUE with add_index unique. Dropping a table makes the user type its name to apply, so propose drop_table only when asked. ` +
	`To change data call preview_write with one INSERT/UPDATE/DELETE; the user sees how many rows it changes and applies it. ` +
	`Inspect the tables a change touches before you propose it; call table_stats before adding NOT NULL or UNIQUE to a column that has data. ` +
	`Before you propose add_index, call explain_query on the slow query and cite what the plan shows (for example a full table scan). ` +
	`When you design several new tables, call propose_schema_change once per table (with its keys and indexes), ` +
	`so the user watches the design grow on the canvas. ` +
	`For work with several steps, call update_plan first and update it as steps finish. ` +
	`Never claim a proposed change or write was applied — say it is waiting for the user's review. ` +
	`End with a short summary of what you proposed and what the user should check.`

// modeInstructions adds how the user reviewed the chat's earlier proposals in
// Agent mode, so the model does not repeat rejected changes or assume pending
// ones exist.
func (s *AiServiceImpl) modeInstructions(ctx context.Context, chatID uint, req *dto.AiChatRequest) string {
	if !req.AgentMode() {
		return askModeInstructions
	}

	if req.AgentTier == serviceDbtools.TierDataWrite {
		instructions := agentModeInstructions + " On this connection you may only propose data changes with preview_write; schema changes are not allowed, so give their SQL for the user to run instead."
		state, _ := s.changesetService.Describe(ctx, chatID)

		return strings.TrimSpace(instructions + "\n\n" + state)
	}

	state, err := s.changesetService.Describe(ctx, chatID)
	if err != nil {
		s.logger.Error(fmt.Sprintf("Failed to describe changesets: %v", err))
	}

	return strings.TrimSpace(agentModeInstructions + "\n\n" + state)
}

// runAgentLoop streams the model response, executing tool calls between
// rounds. It returns the final response plus the ordered tool/diff/permission
// traces to persist with the turn. Tool availability is enforced here, not
// only by the tool list sent to the model.
func (s *AiServiceImpl) runAgentLoop(
	ctx context.Context,
	provider aiProvider.IAiProvider,
	providerReq *aiProvider.ChatRequest,
	chatID uint,
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

			result, callTraces, err := s.runToolCall(ctx, chatID, req, call, toolCtx, emitEvent)
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
			if resp == nil || strings.TrimSpace(resp.Content) == "" {
				finalResp = &aiProvider.ChatResponse{
					Role:     model.AiChatMessageRoleAssistant,
					Content:  fmt.Sprintf("I reached the limit of %d tool rounds before finishing. Ask me to continue, or narrow the request.", maxRounds),
					Type:     model.AiChatMessageTypeExplanation,
					Language: model.AiChatMessageLanguageText,
				}
			}
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
	chatID uint,
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
	case !serviceDbtools.AllowedTool(req.AgentMode(), req.AgentTier, call.Name):
		err = blockedError{fmt.Sprintf("tool %q is not available in %s mode", call.Name, modeName(req.Mode))}
	case call.Name == serviceDbtools.ToolProposeSchemaChange:
		var changeset *dto.AiChangesetResponse
		if changeset, err = s.proposeSchemaChange(ctx, chatID, call.Arguments, toolCtx); err == nil {
			result = fmt.Sprintf("Proposed %d schema change(s). They are shown to the user for review and are NOT applied yet.", len(changeset.Ops))
			msg := traceMessage(model.AiChatMessageTypeDiagramDiff, map[string]uint{"changesetId": changeset.ID})
			ev := streamEvent("diagram_diff", strconv.FormatUint(uint64(changeset.ID), 10), changeset)
			extra, event = &msg, &ev
		}
	case call.Name == serviceDbtools.ToolReviewSchema:
		result, err = s.reviewSchema(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolUpdatePlan:
		var plan *dto.AiPlan
		if plan, err = updatePlan(call.Arguments); err == nil {
			result = "Plan updated."
			msg := traceMessage(model.AiChatMessageTypePlan, plan)
			ev := streamEvent("plan_delta", call.ID, plan)
			extra, event = &msg, &ev
		}
	case call.Name == serviceDbtools.ToolSaveReport:
		var saved *dto.QuestionResponse
		if saved, err = s.saveReport(ctx, call.Arguments, toolCtx); err == nil {
			result = fmt.Sprintf("Saved the report %q (id %d). The user can reopen it from Reports.", saved.Name, saved.ID)
		}
	case call.Name == serviceDbtools.ToolPinReport:
		var board *dto.DashboardResponse
		if board, err = s.pinReport(ctx, call.Arguments); err == nil {
			result = fmt.Sprintf("Pinned to the board %q, which now has %d report(s).", board.Name, len(board.Cards))
		}
	case call.Name == serviceDbtools.ToolPreviewWrite:
		var written *previewWriteResult
		if written, err = s.previewWrite(ctx, chatID, call.Arguments, toolCtx); err == nil {
			result = writePreviewText(written.Preview)
			msg := traceMessage(model.AiChatMessageTypeDiagramDiff, map[string]uint{"changesetId": written.Changeset.ID})
			ev := streamEvent("diagram_diff", strconv.FormatUint(uint64(written.Changeset.ID), 10), written.Changeset)
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

// writePreviewText tells the model what a previewed data change would do.
func writePreviewText(preview *dto.WritePreviewResponse) string {
	text := fmt.Sprintf("The statement would change %d row(s). It is added to the user's proposal for review and has NOT run.", preview.AffectedRows)

	if len(preview.Rows) > 0 {
		rows, _ := json.Marshal(preview.Rows)
		text += " Rows it touches now (sample): " + string(rows)
	}

	return text
}

type saveReportArgs struct {
	Title   string   `json:"title"`
	SQL     string   `json:"sql"`
	Type    string   `json:"type"`
	X       string   `json:"x"`
	Y       []string `json:"y"`
	Stacked bool     `json:"stacked"`
}

// saveReport stores a chart as a report of the chat's connection, database and schema.
func (s *AiServiceImpl) saveReport(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (*dto.QuestionResponse, error) {
	var args saveReportArgs
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	req := &dto.QuestionCreateRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     toolCtx.Database,
		Schema:       toolCtx.Schema,
		Name:         args.Title,
		SQL:          args.SQL,
		Chart:        dto.QuestionChart{Type: args.Type, X: args.X, Y: args.Y, Stacked: args.Stacked},
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}

	return s.questionService.Create(ctx, req)
}

type pinReportArgs struct {
	ReportID uint   `json:"reportId"`
	Board    string `json:"board"`
}

func (s *AiServiceImpl) pinReport(ctx context.Context, rawArgs string) (*dto.DashboardResponse, error) {
	var args pinReportArgs
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	name := strings.TrimSpace(args.Board)
	if name == "" || args.ReportID == 0 {
		return nil, fmt.Errorf("reportId and board are required")
	}

	return s.dashboardService.PinByName(ctx, name, args.ReportID)
}
