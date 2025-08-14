package model

import "time"

type AiProvider struct {
	ID          uint           `gorm:"primaryKey,autoIncrement"`
	Type        AIProviderType `gorm:"size:64;not null"`
	ApiKey      *string        `gorm:"size:2048"`
	Url         *string        `gorm:"size:255"`
	Models      []string       `gorm:"type:json;serializer:json"`
	Temperature *float32
	MaxTokens   *int
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type AIProviderType string

const (
	AIProviderTypeOpenAI    AIProviderType = "openai"
	AIProviderTypeAnthropic AIProviderType = "anthropic"
	AIProviderTypeGemini    AIProviderType = "gemini"
	AIProviderTypeGroq      AIProviderType = "groq"
	AIProviderTypeOllama    AIProviderType = "ollama"
)
