package aiProvider

import (
	"context"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/openai/openai-go/v2"
)

func (p *BaseProvider) StreamChatWithTools(
	ctx context.Context,
	req *ChatRequest,
	cb StreamChatCallback,
) (*ChatResponse, []ToolCall, error) {
	messages := p.buildChatCompletionMessages(req)

	params := openai.ChatCompletionNewParams{
		Messages: messages,
		Model:    req.Model,
	}
	if len(req.Tools) > 0 {
		params.Tools = req.Tools
	}

	stream := p.client.Chat.Completions.NewStreaming(ctx, params)
	if stream.Err() != nil {
		return nil, nil, apperror.InternalServerError(stream.Err())
	}

	var contentBuilder strings.Builder

	answeringStarted := false
	accumulator := openai.ChatCompletionAccumulator{}
	thinkingStart := time.Now()
	reasoningState := newStreamReasoningState(
		func() error {
			thinkingStart = time.Now()
			return cb(StreamEvent{Type: "thinking_start"})
		},
		func(content string) error {
			return cb(StreamEvent{Type: "thinking_delta", Content: content})
		},
		func() error {
			durationMs := time.Since(thinkingStart).Milliseconds()
			return cb(StreamEvent{Type: "thinking_end", DurationMs: durationMs})
		},
	)

	for stream.Next() {
		select {
		case <-ctx.Done():
			stream.Close()
			return nil, nil, ctx.Err()
		default:
		}

		chunk := stream.Current()
		if len(chunk.Choices) == 0 {
			continue
		}

		accumulator.AddChunk(chunk)

		delta := chunk.Choices[0].Delta
		if err := reasoningState.processReasoningField(delta.RawJSON()); err != nil {
			stream.Close()
			return nil, nil, err
		}

		if delta.Content != "" {
			answer, err := reasoningState.processContentField(delta.Content)
			if err != nil {
				stream.Close()
				return nil, nil, err
			}

			leaked := stripToolCallLeak(answer)
			if leaked == "" {
				continue
			}

			if !answeringStarted {
				answeringStarted = true

				if err := cb(StreamEvent{Type: "block_start", BlockType: "explanation"}); err != nil {
					stream.Close()
					return nil, nil, err
				}
			}

			contentBuilder.WriteString(leaked)

			if err := cb(StreamEvent{Type: "content_delta", Content: leaked}); err != nil {
				stream.Close()
				return nil, nil, err
			}
		}
	}

	stream.Close()

	if stream.Err() != nil {
		return nil, nil, apperror.InternalServerError(stream.Err())
	}

	if err := reasoningState.finish(); err != nil {
		return nil, nil, err
	}

	finishReason := ""
	if len(accumulator.Choices) > 0 {
		finishReason = string(accumulator.Choices[0].FinishReason)
	}

	if finishReason == "tool_calls" && len(accumulator.Choices) > 0 {
		toolCalls := make([]ToolCall, 0, len(accumulator.Choices[0].Message.ToolCalls))
		for _, tc := range accumulator.Choices[0].Message.ToolCalls {
			if tc.Function.Name == "" {
				continue
			}

			toolCalls = append(toolCalls, ToolCall{
				ID:        tc.ID,
				Name:      tc.Function.Name,
				Arguments: tc.Function.Arguments,
			})
		}

		return &ChatResponse{
			Role:     model.AiChatMessageRoleAssistant,
			Content:  "",
			Type:     model.AiChatMessageTypeExplanation,
			Language: model.AiChatMessageLanguageText,
		}, toolCalls, nil
	}

	if answeringStarted {
		if err := cb(StreamEvent{Type: "block_end"}); err != nil {
			return nil, nil, err
		}
	}

	fullContent := strings.TrimSpace(stripToolCallLeak(contentBuilder.String()))
	if fullContent == "" {
		return &ChatResponse{
			Role:     model.AiChatMessageRoleAssistant,
			Content:  "",
			Type:     model.AiChatMessageTypeExplanation,
			Language: model.AiChatMessageLanguageText,
		}, nil, nil
	}

	resp, err := p.convertToStructuredResponse(fullContent, model.AiChatMessageRoleAssistant)

	return resp, nil, err
}
