package serviceAiProvider

import (
	"context"
	"regexp"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
	"github.com/openai/openai-go/v2"
	"github.com/samber/lo"
)

type BaseProvider struct {
	client  openai.Client
	context context.Context
}

func NewBaseProvider(ctx context.Context, client openai.Client) IAiProvider {
	return &BaseProvider{
		client:  client,
		context: ctx,
	}
}

func (p *BaseProvider) Chat(_ context.Context, req *ChatRequest) (*ChatResponse, error) {
	messages := p.buildChatCompletionMessages(req)

	chatCompletion, err := p.client.Chat.Completions.New(
		p.context,
		openai.ChatCompletionNewParams{
			Messages: messages,
			Model:    req.Model,
		},
	)

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return p.convertToStructuredResponse(
		strings.TrimSpace(chatCompletion.Choices[0].Message.Content),
		model.AiChatMessageRole(chatCompletion.Choices[0].Message.Role),
	)
}

func (p *BaseProvider) StreamChat(ctx context.Context, req *ChatRequest, cb StreamChatCallback) (*ChatResponse, error) {
	messages := p.buildChatCompletionMessages(req)

	stream := p.client.Chat.Completions.NewStreaming(
		p.context,
		openai.ChatCompletionNewParams{
			Messages: messages,
			Model:    req.Model,
		},
	)

	if stream.Err() != nil {
		return nil, apperror.InternalServerError(stream.Err())
	}

	var contentBuilder strings.Builder
	answeringStarted := false
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
			return nil, ctx.Err()
		default:
		}

		chunk := stream.Current()
		if len(chunk.Choices) == 0 {
			continue
		}

		delta := chunk.Choices[0].Delta
		if err := reasoningState.processReasoningField(delta.RawJSON()); err != nil {
			stream.Close()
			return nil, err
		}

		if delta.Content != "" {
			answer, err := reasoningState.processContentField(delta.Content)
			if err != nil {
				stream.Close()
				return nil, err
			}

			if answer == "" {
				continue
			}

			if !answeringStarted {
				answeringStarted = true
				if err := cb(StreamEvent{Type: "block_start", BlockType: "explanation"}); err != nil {
					stream.Close()
					return nil, err
				}
			}

			contentBuilder.WriteString(answer)
			if err := cb(StreamEvent{Type: "content_delta", Content: answer}); err != nil {
				stream.Close()
				return nil, err
			}
		}
	}

	stream.Close()

	if stream.Err() != nil {
		return nil, apperror.InternalServerError(stream.Err())
	}

	if err := reasoningState.finish(); err != nil {
		return nil, err
	}

	if answeringStarted {
		if err := cb(StreamEvent{Type: "block_end"}); err != nil {
			return nil, err
		}
	}

	fullContent := strings.TrimSpace(contentBuilder.String())
	if fullContent == "" {
		return &ChatResponse{
			Role:     model.AiChatMessageRoleAssistant,
			Content:  "",
			Type:     model.AiChatMessageTypeExplanation,
			Language: model.AiChatMessageLanguageText,
		}, nil
	}

	return p.convertToStructuredResponse(fullContent, model.AiChatMessageRoleAssistant)
}

func (p *BaseProvider) buildChatCompletionMessages(req *ChatRequest) []openai.ChatCompletionMessageParamUnion {
	messages := make([]openai.ChatCompletionMessageParamUnion, 0, len(req.Messages)+1)

	messages = append(messages, openai.ChatCompletionMessageParamUnion{
		OfSystem: &openai.ChatCompletionSystemMessageParam{
			Content: openai.ChatCompletionSystemMessageParamContentUnion{
				OfString: openai.String(p.buildSystemPrompt(req)),
			},
		},
	})

	for _, msg := range req.Messages {
		if msg.Role == model.AiChatMessageRoleAssistant {
			messages = append(messages, openai.ChatCompletionMessageParamUnion{
				OfAssistant: &openai.ChatCompletionAssistantMessageParam{
					Content: openai.ChatCompletionAssistantMessageParamContentUnion{
						OfString: openai.String(msg.Content),
					},
				},
			})
		} else {
			messages = append(messages, openai.ChatCompletionMessageParamUnion{
				OfUser: &openai.ChatCompletionUserMessageParam{
					Content: openai.ChatCompletionUserMessageParamContentUnion{
						OfString: openai.String(msg.Content),
					},
				},
			})
		}
	}

	if len(req.ExtraMessages) > 0 {
		messages = append(messages, req.ExtraMessages...)
	}

	return messages
}

func (p *BaseProvider) Complete(_ context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	suffix := ""
	if req.Suffix != nil {
		suffix = *req.Suffix
	}

	chatCompletion, err := p.client.Chat.Completions.New(
		p.context,
		openai.ChatCompletionNewParams{
			Messages: []openai.ChatCompletionMessageParamUnion{
				{
					OfSystem: &openai.ChatCompletionSystemMessageParam{
						Content: openai.ChatCompletionSystemMessageParamContentUnion{
							OfString: openai.String(p.buildCompletionSystemPrompt(req.Context)),
						},
					},
				},
				{
					OfUser: &openai.ChatCompletionUserMessageParam{
						Content: openai.ChatCompletionUserMessageParamContentUnion{
							OfString: openai.String(p.buildCompletionUserPrompt(req.Prompt, suffix)),
						},
					},
				},
			},
			Model:       req.Model,
			Temperature: openai.Float(0.1),
		},
	)

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	raw := strings.TrimSpace(chatCompletion.Choices[0].Message.Content)

	return &CompletionResponse{
		Completion: sanitizeCompletion(req.Prompt, suffix, raw),
	}, nil
}

func (p *BaseProvider) buildCompletionSystemPrompt(schemaContext string) string {
	var sb strings.Builder

	sb.WriteString("You are an SQL fill-in-the-middle assistant.\n")
	sb.WriteString("The user edits SQL with a cursor between PREFIX and SUFFIX.\n")
	sb.WriteString("Return ONLY the exact text to insert at the cursor.\n\n")
	sb.WriteString("Rules:\n")
	sb.WriteString("- Output raw SQL only. No markdown, comments, or explanations.\n")
	sb.WriteString("- Do NOT repeat text from PREFIX or SUFFIX.\n")
	sb.WriteString("- Do NOT rewrite the whole query — only the missing middle segment.\n")
	sb.WriteString("- Do NOT add a semicolon unless SQL grammar requires it immediately before SUFFIX.\n")
	sb.WriteString("- When SUFFIX is non-empty, the insertion must connect PREFIX to SUFFIX naturally.\n")
	sb.WriteString("- Prefer valid table/column names from the schema when relevant.\n")

	if schemaContext != "" {
		sb.WriteString("\nSchema:\n")
		sb.WriteString(schemaContext)
	}

	return sb.String()
}

func (p *BaseProvider) buildCompletionUserPrompt(prefix, suffix string) string {
	var sb strings.Builder

	sb.WriteString("PREFIX:\n")
	sb.WriteString(prefix)
	sb.WriteString("\n\n<<<CURSOR>>>\n\n")

	if suffix != "" {
		sb.WriteString("SUFFIX:\n")
		sb.WriteString(suffix)
		sb.WriteString("\n\n")
	} else {
		sb.WriteString("SUFFIX: (empty)\n\n")
	}

	sb.WriteString("Return ONLY the text to insert at <<<CURSOR>>>:")

	return sb.String()
}

func (p *BaseProvider) buildSystemPrompt(req *ChatRequest) string {
	if req.UseMarkdownPrompt {
		return p.buildStreamChatPrompt(req)
	}
	return p.buildChatPrompt(req)
}

func (p *BaseProvider) appendQueryContext(sb *strings.Builder, req *ChatRequest) {
	if req.SelectedQuery != "" {
		sb.WriteString("\nSelected SQL (user highlight):\n")
		sb.WriteString(req.SelectedQuery)
		sb.WriteString("\n")
	} else if req.Query != "" {
		sb.WriteString("\nCurrent Query:\n")
		sb.WriteString(req.Query)
		sb.WriteString("\n")
	}

	if req.QueryError != "" {
		sb.WriteString("\nLast query error:\n")
		sb.WriteString(req.QueryError)
		sb.WriteString("\n")
	}

	if req.QueryResultSummary != "" {
		sb.WriteString("\nLast query result:\n")
		sb.WriteString(req.QueryResultSummary)
		sb.WriteString("\n")
	}

	if req.ObjectDefinition != "" {
		sb.WriteString("\nObject definition (form being edited):\n")
		sb.WriteString(req.ObjectDefinition)
		sb.WriteString("\n")
	}
}

func (p *BaseProvider) buildStreamChatPrompt(req *ChatRequest) string {
	var sb strings.Builder

	sb.WriteString("You are an SQL and database assistant.\n")
	sb.WriteString("You must ONLY answer programming-related or SQL-related questions.\n")
	sb.WriteString("If the user asks anything outside these domains, respond with a short refusal.\n\n")
	sb.WriteString("Rules:\n")
	sb.WriteString("- Only use the schema provided below.\n")
	sb.WriteString("- Do not invent columns or tables.\n")
	sb.WriteString("- Never reveal or explain the raw schema/context directly to the user.\n")
	sb.WriteString("- For SQL, use fenced code blocks with language sql.\n")
	sb.WriteString("- For explanations, use plain markdown text.\n")
	sb.WriteString("- You may include multiple code blocks and explanations in one response.\n")
	sb.WriteString("- Use the provided function tools for database lookups and queries. Never write tool invocations as JSON text in your reply.\n")
	sb.WriteString("- When Selected SQL or Current Query appears in the context below, use it directly for explain, optimize, or fix requests.\n")
	sb.WriteString("- When Object definition appears in the context below, use it directly for suggest or review requests about schema objects.\n")
	sb.WriteString("- Only ask the user to paste SQL when no Selected SQL, Current Query, or SQL code block is available. Do not invent SQL.\n")
	sb.WriteString("- When showing sample query rows in explanations, prefer markdown tables over raw JSON arrays.\n\n")

	p.appendQueryContext(&sb, req)

	sb.WriteString("\nSchema:\n")
	sb.WriteString(req.Context)

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
	p.appendQueryContext(&sb, req)

	return sb.String()
}

func (p *BaseProvider) parseMarkdownBlocks(content string) []model.AiChatMessageContent {
	blocks := make([]model.AiChatMessageContent, 0)
	fenceRe := regexp.MustCompile("(?s)```(\\w*)\\n(.*?)```")
	matches := fenceRe.FindAllStringSubmatchIndex(content, -1)

	if len(matches) == 0 {
		trimmed := strings.TrimSpace(content)
		if trimmed != "" {
			blocks = append(blocks, model.AiChatMessageContent{
				Type:     model.AiChatMessageTypeExplanation,
				Content:  trimmed,
				Language: model.AiChatMessageLanguageText,
			})
		}
		return blocks
	}

	lastEnd := 0
	for _, match := range matches {
		if match[0] > lastEnd {
			text := strings.TrimSpace(content[lastEnd:match[0]])
			if text != "" {
				blocks = append(blocks, model.AiChatMessageContent{
					Type:     model.AiChatMessageTypeExplanation,
					Content:  text,
					Language: model.AiChatMessageLanguageText,
				})
			}
		}

		lang := content[match[2]:match[3]]
		code := strings.TrimSpace(content[match[4]:match[5]])
		msgType := model.AiChatMessageTypeExplanation
		language := model.AiChatMessageLanguageText
		if lang == "sql" || strings.EqualFold(lang, "sql") {
			msgType = model.AiChatMessageTypeCode
			language = model.AiChatMessageLanguageSQL
		} else if lang != "" {
			msgType = model.AiChatMessageTypeCode
			language = model.AiChatMessageLanguage(lang)
		}

		blocks = append(blocks, model.AiChatMessageContent{
			Type:     msgType,
			Content:  code,
			Language: language,
		})
		lastEnd = match[1]
	}

	if lastEnd < len(content) {
		text := strings.TrimSpace(content[lastEnd:])
		if text != "" {
			blocks = append(blocks, model.AiChatMessageContent{
				Type:     model.AiChatMessageTypeExplanation,
				Content:  text,
				Language: model.AiChatMessageLanguageText,
			})
		}
	}

	return blocks
}

func (p *BaseProvider) convertToStructuredResponse(content string, role model.AiChatMessageRole) (*ChatResponse, error) {
	var structuredResponse struct {
		Contents []AiMessageContent `json:"contents"`
	}

	re := regexp.MustCompile(`\\([^"\\/bfnrtu])`)
	clean := re.ReplaceAllString(content, "$1")

	clean = stripToolCallLeak(clean)

	if strings.HasPrefix(clean, "```json") {
		clean = strings.TrimPrefix(clean, "```json")
		clean = strings.TrimSuffix(clean, "```")
	}

	contents := make([]model.AiChatMessageContent, 0)

	err := json.Unmarshal([]byte(clean), &structuredResponse)
	if err != nil {
		if markdownBlocks := p.parseMarkdownBlocks(clean); len(markdownBlocks) > 0 {
			contents = markdownBlocks
		} else {
			contents = append(contents, model.AiChatMessageContent{
				Type:     "explanation",
				Content:  clean,
				Language: "text",
			})
		}
	} else {
		for _, content := range structuredResponse.Contents {
			if content.Language == nil {
				content.Language = lo.ToPtr(model.AiChatMessageLanguageText)
			}

			contents = append(contents, model.AiChatMessageContent{
				Type:     content.Type,
				Content:  content.Content,
				Language: lo.FromPtr(content.Language),
			})
		}
	}

	if len(contents) == 0 {
		contents = append(contents, model.AiChatMessageContent{
			Type:     model.AiChatMessageTypeExplanation,
			Content:  clean,
			Language: model.AiChatMessageLanguageText,
		})
	}

	return &ChatResponse{
		Role:     role,
		Content:  content,
		Type:     contents[0].Type,
		Language: contents[0].Language,
		Contents: contents,
	}, nil
}
