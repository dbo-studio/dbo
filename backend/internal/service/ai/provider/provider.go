package serviceAiProvider

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/openai/openai-go/v2"
)

type IAiProvider interface {
	Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	StreamChat(ctx context.Context, req *ChatRequest, cb StreamChatCallback) (*ChatResponse, error)
	StreamChatWithTools(ctx context.Context, req *ChatRequest, cb StreamChatCallback) (*ChatResponse, []ToolCall, error)
	Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)
}

type ChatRequest struct {
	Messages           []model.AiChatMessage `json:"messages"`
	Model              string                `json:"model"`
	Context            string                `json:"context,omitempty"`
	Query              string                `json:"query,omitempty"`
	SelectedQuery      string                `json:"selectedQuery,omitempty"`
	QueryError         string                `json:"queryError,omitempty"`
	QueryResultSummary string                `json:"queryResultSummary,omitempty"`
	ObjectDefinition   string                `json:"objectDefinition,omitempty"`
	UseMarkdownPrompt  bool                  `json:"-"`
	Tools              []openai.ChatCompletionToolUnionParam
	ExtraMessages      []openai.ChatCompletionMessageParamUnion
}

type ToolCall struct {
	ID        string
	Name      string
	Arguments string
}

type ChatResponse struct {
	Role     model.AiChatMessageRole      `json:"role"`
	Content  string                       `json:"content"`
	Type     model.AiChatMessageType      `json:"type"`
	Language model.AiChatMessageLanguage  `json:"language"`
	Contents []model.AiChatMessageContent `json:"contents,omitempty"`
}

type CompletionRequest struct {
	Prompt  string  `json:"prompt"`
	Suffix  *string `json:"suffix,omitempty"`
	Model   string  `json:"model"`
	Context string  `json:"context,omitempty"`
}

type CompletionResponse struct {
	Completion string `json:"completion"`
}

type AiMessageResponse struct {
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	Done bool `json:"done"`
}

type AiMessageContent struct {
	Type     model.AiChatMessageType      `json:"type"`
	Content  string                       `json:"content"`
	Language *model.AiChatMessageLanguage `json:"language,omitempty"`
}
