package model

import "time"

type AiProvider struct {
	ID          uint           `gorm:"primaryKey,autoIncrement"`
	Type        AIProviderType `gorm:"size:64;not null"`
	Url         string         `gorm:"size:255"`
	ApiKey      *string        `gorm:"size:2048"`
	Timeout     int
	Temperature *float32
	MaxTokens   *int
	Models      []string `gorm:"type:json;serializer:json"`
	LastUsedAt  time.Time
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
