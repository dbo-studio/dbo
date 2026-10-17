package dto

import "github.com/invopop/validation"

type (
	AiChatRequest struct {
		ConnectionID int32             `json:"connectionId"`
		Message      string            `json:"message"`
		ChatID       *int32            `json:"chatId"`
		ContextOpts  *AiContextOptions `json:"contextOpts"`
		Mode         string            `json:"mode"`
		// ProviderID and Model override the active provider for this turn only (compare with another model).
		ProviderID *uint  `json:"providerId"`
		Model      string `json:"model"`
	}

	AiContextOptions struct {
		Query              *string  `json:"query"`
		SelectedQuery      *string  `json:"selectedQuery"`
		Database           *string  `json:"database"`
		Schema             *string  `json:"schema"`
		Tables             []string `json:"tables"`
		Views              []string `json:"views"`
		QueryResultSummary *string  `json:"queryResultSummary"`
		ObjectDefinition   *string  `json:"objectDefinition"`
	}

	AiChatResponse struct {
		ChatID   uint        `json:"chatId"`
		Title    string      `json:"title"`
		Messages []AiMessage `json:"messages"`
	}
)

type (
	AiMessage struct {
		Role      string `json:"role"`
		Content   string `json:"content"`
		Type      string `json:"type"`
		Language  string `json:"language"`
		CreatedAt string `json:"createdAt"`
		Model     string `json:"model,omitempty"`
		Feedback  string `json:"feedback,omitempty"`
	}
)

func (req AiChatRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Message, validation.Required, validation.Length(0, 10000)),
		validation.Field(&req.ChatID, validation.Min(0)),
		validation.Field(&req.Mode, validation.In(AiChatModeAsk, AiChatModeAgent)),
	)
}

const (
	AiChatModeAsk   = "ask"
	AiChatModeAgent = "agent"
)

// AgentMode reports whether the request runs with write/propose tools. Empty or
// unknown modes fall back to Ask so older clients never gain write tools.
func (req AiChatRequest) AgentMode() bool {
	return req.Mode == AiChatModeAgent
}
