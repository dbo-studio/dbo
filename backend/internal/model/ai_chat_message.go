package model

import "time"

type AiChatMessage struct {
	ID        uint              `gorm:"primaryKey,autoIncrement"`
	ChatId    uint              `gorm:"index;not null"`
	Role      AiChatMessageRole `gorm:"size:32;not null"`
	Content   string            `gorm:"type:text;not null"`
	Type      AiChatMessageType
	Language  AiChatMessageLanguage
	CreatedAt time.Time
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
)

type AiChatMessageLanguage string

const (
	AiChatMessageLanguageSql    AiChatMessageLanguage = "sql"
	AiChatMessageLanguageGo     AiChatMessageLanguage = "go"
	AiChatMessageLanguageJs     AiChatMessageLanguage = "js"
	AiChatMessageLanguagePython AiChatMessageLanguage = "python"
	AiChatMessageLanguageJson   AiChatMessageLanguage = "json"
	AiChatMessageLanguageYaml   AiChatMessageLanguage = "yaml"
	AiChatMessageLanguageText   AiChatMessageLanguage = "text"
)
