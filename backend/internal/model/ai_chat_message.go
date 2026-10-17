package model

import "time"

type AiChatMessage struct {
	ID       uint              `gorm:"primaryKey,autoIncrement"`
	ChatID   uint              `gorm:"index;not null"`
	Role     AiChatMessageRole `gorm:"size:32;not null"`
	Content  string            `gorm:"type:text;not null"`
	Type     AiChatMessageType
	Language AiChatMessageLanguage
	// Model is the LLM that wrote an assistant message; empty for user messages and older rows.
	Model string `gorm:"size:128;not null;default:''"`
	// Feedback is the user's rating of an assistant answer: "up", "down" or empty.
	Feedback  string     `gorm:"size:8;not null;default:''"`
	CreatedAt *time.Time `gorm:"autoCreateTime"`
}

type AiChatMessageContent struct {
	Type     AiChatMessageType     `json:"type"`
	Content  string                `json:"content"`
	Language AiChatMessageLanguage `json:"language,omitempty"`
}

type AiChatMessageRole string

const (
	AiChatMessageRoleUser      AiChatMessageRole = "user"
	AiChatMessageRoleAssistant AiChatMessageRole = "assistant"
	AiChatMessageRoleSystem    AiChatMessageRole = "system"
)

type AiChatMessageType string

const (
	AiChatMessageTypeCode        AiChatMessageType = "code"
	AiChatMessageTypeExplanation AiChatMessageType = "explanation"
	// Agent traces: JSON payloads rendered as cards, never sent back to the model as history.
	AiChatMessageTypeTool        AiChatMessageType = "tool"
	AiChatMessageTypeDiagramDiff AiChatMessageType = "diagram_diff"
	AiChatMessageTypePermission  AiChatMessageType = "permission"
)

// IsConversational reports whether the message is part of the model-visible
// conversation (as opposed to an agent trace card).
func (t AiChatMessageType) IsConversational() bool {
	return t == "" || t == AiChatMessageTypeCode || t == AiChatMessageTypeExplanation
}

type AiChatMessageLanguage string

const (
	AiChatMessageLanguageSQL    AiChatMessageLanguage = "sql"
	AiChatMessageLanguageGo     AiChatMessageLanguage = "go"
	AiChatMessageLanguageJs     AiChatMessageLanguage = "js"
	AiChatMessageLanguagePython AiChatMessageLanguage = "python"
	AiChatMessageLanguageJSON   AiChatMessageLanguage = "json"
	AiChatMessageLanguageYaml   AiChatMessageLanguage = "yaml"
	AiChatMessageLanguageText   AiChatMessageLanguage = "text"
)
