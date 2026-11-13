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
	"github.com/samber/lo"
)

const (
	maxAskToolRounds   = 5
	maxAgentToolRounds = 10

	// Long enough for the largest SQL an op accepts; a cut would break the stored JSON.
	maxToolArgsLen   = 10000
	maxToolResultLen = 20000
)

const noSQLAgentInstructions = `Mode: AGENT. You can read with tools and propose writes with preview_write. ` +
	`A proposal is a list of write statements (MongoDB shell statements, or Redis commands); the user sees how many documents or keys each touches, reviews it, and applies it. Nothing runs until then. ` +
	`Read first (describe_container, browse_container, run_command) so a filter matches what you mean. Prefer a narrow filter; use updateMany or deleteMany only when asked. ` +
	`On MongoDB start each statement with use <database>; and write one call. Do not propose a statement that drops a collection or index unless the user asked for it. ` +
	`Use update_plan for a multi-step task.`

const noSQLModeInstructions = `Mode: ASK. You can list containers, describe them, browse and read items, run read-only commands and (MongoDB) read-only aggregations with tools. ` +
	`You cannot change the data. When the user wants a change, give the statement in a code block for them to review and run.`

const askModeInstructions = `Mode: ASK. You can inspect the schema and run read-only SELECT queries with tools. ` +
	`To explain why a query is slow, call explain_query and base any index advice on the plan. ` +
	`When asked to review or improve the schema, call review_schema. ` +
	`You cannot change the database. When the user wants a change, give the SQL in a code block for them to review and run, ` +
	`and say that Agent mode can prepare it as a change they review and apply.`

const agentModeInstructions = `Mode: AGENT. Work step by step with tools. ` +
	`To design or change schema (create databases and schemas, create, rename or drop tables, add/alter/rename/drop columns, add indexes, foreign keys and checks, drop constraints, create or drop views) call propose_schema_change; the user reviews it and applies it. ` +
	`Set NOT NULL with alter_column and UNIQUE with add_index unique. Dropping a table makes the user type its name to apply, so propose drop_table only when asked. ` +
	`To change data call preview_write with one INSERT/UPDATE/DELETE, or with statements for several that belong together; the user sees how many rows each changes and applies them together. ` +
	`To seed data, inspect the tables, then call preview_write with statements that insert parent rows before the child rows that reference them, with realistic values of the right types and at most 50 rows per table unless asked. ` +
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
	if req.NoSQL {
		if !req.AgentMode() {
			return noSQLModeInstructions
		}

		state, _ := s.changesetService.Describe(ctx, chatID)

		return strings.TrimSpace(noSQLAgentInstructions + "\n\n" + state)
	}

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

	toolCtx := serviceDbtools.ToolContext{ConnectionID: req.ConnectionID, NoSQL: req.NoSQL}
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
	case toolCtx.NoSQL && !serviceDbtools.AllowedNoSQLTool(req.AgentMode(), req.AgentTier, call.Name):
		err = blockedError{fmt.Sprintf("tool %q is not available on this connection", call.Name)}
	case !toolCtx.NoSQL && !serviceDbtools.AllowedTool(req.AgentMode(), req.AgentTier, call.Name):
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
	case call.Name == serviceDbtools.ToolShowChart && hasParams(call.Arguments):
		result, err = s.showChartWithParams(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolUpdateReport:
		result, err = s.updateReport(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolDeleteReport:
		result, err = s.deleteReport(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolRenameBoard:
		result, err = s.renameBoard(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolDeleteBoard:
		result, err = s.deleteBoard(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolUnpinReport:
		result, err = s.unpinReport(ctx, call.Arguments, toolCtx)
	case call.Name == serviceDbtools.ToolListReports:
		result, err = s.listReports(ctx, toolCtx)
	case call.Name == serviceDbtools.ToolPinReport:
		var board *dto.DashboardResponse
		if board, err = s.pinReport(ctx, call.Arguments); err == nil {
			result = fmt.Sprintf("Pinned to the board %q, which now has %d report(s).", board.Name, len(board.Cards))
		}
	case call.Name == serviceDbtools.ToolPreviewWrite:
		var written *previewWriteResult
		if toolCtx.NoSQL {
			written, err = s.previewNoSQLWrite(ctx, chatID, call.Arguments, toolCtx)
		} else {
			written, err = s.previewWrite(ctx, chatID, call.Arguments, toolCtx)
		}

		if err == nil {
			result = writePreviewText(written.Previews)
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
func writePreviewText(previews []*dto.WritePreviewResponse) string {
	if len(previews) == 1 {
		text := fmt.Sprintf("The statement would change %d row(s). It is added to the user's proposal for review and has NOT run.", previews[0].AffectedRows)

		if len(previews[0].Rows) > 0 {
			rows, _ := json.Marshal(previews[0].Rows)
			text += " Rows it touches now (sample): " + string(rows)
		}

		return text
	}

	counts := lo.Map(previews, func(preview *dto.WritePreviewResponse, i int) string {
		return fmt.Sprintf("statement %d: %d row(s)", i+1, preview.AffectedRows)
	})

	return fmt.Sprintf("The %d statements would change %s. They are added to the user's proposal as one change for review and have NOT run; "+
		"they apply together.", len(previews), strings.Join(counts, ", "))
}

type saveReportArgs struct {
	Title   string   `json:"title"`
	SQL     string   `json:"sql"`
	Type    string   `json:"type"`
	X       string   `json:"x"`
	Y       []string `json:"y"`
	Stacked bool     `json:"stacked"`
	Group   string   `json:"group"`
	Size    string   `json:"size"`
	Goal    float64  `json:"goal"`
	// Container, Pipeline and Command replace SQL on a MongoDB or Redis connection.
	Container string `json:"container"`
	Pipeline  string `json:"pipeline"`
	Command   string `json:"command"`
	// Params are the default values of the {{filters}} in SQL.
	Params map[string]string `json:"params"`
}

// hasParams reports whether a show_chart call fills {{filters}}, which the plain SQL path cannot run.
func hasParams(rawArgs string) bool {
	var args struct {
		Params map[string]string `json:"params"`
	}

	return json.Unmarshal([]byte(rawArgs), &args) == nil && len(args.Params) > 0
}

// showChartWithParams runs a chart's SQL with its filters filled, the way a saved report runs.
func (s *AiServiceImpl) showChartWithParams(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args saveReportArgs
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	if toolCtx.NoSQL {
		spec, err := serviceDbtools.NoSQLSpecFromArgs(args.Container, args.Pipeline, args.Command)
		if err != nil {
			return "", err
		}

		args.SQL = spec
	}

	result, err := s.questionService.Preview(ctx, &dto.QuestionPreviewRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     toolCtx.Database,
		Schema:       toolCtx.Schema,
		SQL:          args.SQL,
		Params:       args.Params,
	})

	return string(result), err
}

// saveReport stores a chart as a report of the chat's connection, database and schema.
func (s *AiServiceImpl) saveReport(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (*dto.QuestionResponse, error) {
	var args saveReportArgs
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	if toolCtx.NoSQL {
		spec, err := serviceDbtools.NoSQLSpecFromArgs(args.Container, args.Pipeline, args.Command)
		if err != nil {
			return nil, err
		}

		args.SQL = spec
	}

	req := &dto.QuestionCreateRequest{
		ConnectionID: toolCtx.ConnectionID,
		Database:     toolCtx.Database,
		Schema:       toolCtx.Schema,
		Name:         args.Title,
		SQL:          args.SQL,
		Chart:        dto.QuestionChart{Type: args.Type, X: args.X, Y: args.Y, Stacked: args.Stacked, Group: args.Group, Size: args.Size, Goal: args.Goal},
		Params:       args.Params,
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}

	return s.questionService.Create(ctx, req)
}

// listReports tells the agent what already exists: each report with its id, and each board with the reports on it.
func (s *AiServiceImpl) listReports(ctx context.Context, toolCtx serviceDbtools.ToolContext) (string, error) {
	reports, err := s.questionService.Index(ctx, &dto.QuestionListRequest{ConnectionID: toolCtx.ConnectionID})
	if err != nil {
		return "", err
	}

	boards, err := s.dashboardService.Index(ctx, &dto.DashboardListRequest{ConnectionID: toolCtx.ConnectionID})
	if err != nil {
		return "", err
	}

	type report struct {
		ID    uint   `json:"id"`
		Title string `json:"title"`
		Type  string `json:"type"`
	}

	type board struct {
		Name    string   `json:"name"`
		Reports []string `json:"reports"`
	}

	out := struct {
		Reports []report `json:"reports"`
		Boards  []board  `json:"boards"`
	}{Reports: []report{}, Boards: []board{}}

	for _, item := range reports {
		out.Reports = append(out.Reports, report{ID: item.ID, Title: item.Name, Type: item.Chart.Type})
	}

	for _, item := range boards {
		names := []string{}
		for _, card := range item.Cards {
			names = append(names, card.Question.Name)
		}

		out.Boards = append(out.Boards, board{Name: item.Name, Reports: names})
	}

	encoded, err := json.Marshal(out)

	return string(encoded), err
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

// ownReport finds a report of the chat's connection; ids of other connections are not reachable from a chat.
func (s *AiServiceImpl) ownReport(ctx context.Context, toolCtx serviceDbtools.ToolContext, id uint) (*dto.QuestionResponse, error) {
	reports, err := s.questionService.Index(ctx, &dto.QuestionListRequest{ConnectionID: toolCtx.ConnectionID})
	if err != nil {
		return nil, err
	}

	report, found := lo.Find(reports, func(item dto.QuestionResponse) bool { return item.ID == id })
	if !found {
		return nil, fmt.Errorf("report %d not found on this connection", id)
	}

	return &report, nil
}

// ownBoard finds a board of the chat's connection by name.
func (s *AiServiceImpl) ownBoard(ctx context.Context, toolCtx serviceDbtools.ToolContext, name string) (*dto.DashboardResponse, error) {
	boards, err := s.dashboardService.Index(ctx, &dto.DashboardListRequest{ConnectionID: toolCtx.ConnectionID})
	if err != nil {
		return nil, err
	}

	board, found := lo.Find(boards, func(item dto.DashboardResponse) bool { return item.Name == strings.TrimSpace(name) })
	if !found {
		return nil, fmt.Errorf("board %q not found", name)
	}

	return &board, nil
}

func (s *AiServiceImpl) updateReport(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args struct {
		ReportID uint               `json:"reportId"`
		Title    *string            `json:"title"`
		SQL      *string            `json:"sql"`
		Type     *string            `json:"type"`
		X        *string            `json:"x"`
		Y        *[]string          `json:"y"`
		Stacked  *bool              `json:"stacked"`
		Group    *string            `json:"group"`
		Size     *string            `json:"size"`
		Goal     *float64           `json:"goal"`
		Params   *map[string]string `json:"params"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	report, err := s.ownReport(ctx, toolCtx, args.ReportID)
	if err != nil {
		return "", err
	}

	// The chart is replaced as a whole, so start from what is saved and change the fields given.
	chart := report.Chart
	chart.Type = lo.FromPtrOr(args.Type, chart.Type)
	chart.X = lo.FromPtrOr(args.X, chart.X)
	chart.Y = lo.FromPtrOr(args.Y, chart.Y)
	chart.Stacked = lo.FromPtrOr(args.Stacked, chart.Stacked)
	chart.Group = lo.FromPtrOr(args.Group, chart.Group)
	chart.Size = lo.FromPtrOr(args.Size, chart.Size)
	chart.Goal = lo.FromPtrOr(args.Goal, chart.Goal)

	req := &dto.QuestionUpdateRequest{Name: args.Title, SQL: args.SQL, Chart: &chart, Params: args.Params}
	if err := req.Validate(); err != nil {
		return "", err
	}

	updated, err := s.questionService.Update(ctx, args.ReportID, req)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("Updated the report %q (id %d).", updated.Name, updated.ID), nil
}

func (s *AiServiceImpl) deleteReport(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args struct {
		ReportID uint `json:"reportId"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	report, err := s.ownReport(ctx, toolCtx, args.ReportID)
	if err != nil {
		return "", err
	}

	if err := s.questionService.Delete(ctx, report.ID); err != nil {
		return "", err
	}

	return fmt.Sprintf("Deleted the report %q. It is gone from every board.", report.Name), nil
}

func (s *AiServiceImpl) renameBoard(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args struct {
		Board   string `json:"board"`
		NewName string `json:"newName"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	board, err := s.ownBoard(ctx, toolCtx, args.Board)
	if err != nil {
		return "", err
	}

	req := &dto.DashboardRenameRequest{Name: strings.TrimSpace(args.NewName)}
	if err := req.Validate(); err != nil {
		return "", err
	}

	renamed, err := s.dashboardService.Rename(ctx, board.ID, req)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("Renamed the board %q to %q.", board.Name, renamed.Name), nil
}

func (s *AiServiceImpl) deleteBoard(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args struct {
		Board string `json:"board"`
	}
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	board, err := s.ownBoard(ctx, toolCtx, args.Board)
	if err != nil {
		return "", err
	}

	if err := s.dashboardService.Delete(ctx, board.ID); err != nil {
		return "", err
	}

	return fmt.Sprintf("Deleted the board %q. Its %d report(s) stay saved.", board.Name, len(board.Cards)), nil
}

func (s *AiServiceImpl) unpinReport(ctx context.Context, rawArgs string, toolCtx serviceDbtools.ToolContext) (string, error) {
	var args pinReportArgs
	if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	board, err := s.ownBoard(ctx, toolCtx, args.Board)
	if err != nil {
		return "", err
	}

	card, found := lo.Find(board.Cards, func(item dto.DashboardCardResponse) bool { return item.Question.ID == args.ReportID })
	if !found {
		return "", fmt.Errorf("report %d is not on the board %q", args.ReportID, board.Name)
	}

	if _, err := s.dashboardService.Unpin(ctx, board.ID, card.ID); err != nil {
		return "", err
	}

	return fmt.Sprintf("Took the report off the board %q. The report is still saved.", board.Name), nil
}
