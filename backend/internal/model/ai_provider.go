package model

import "time"

type AIProvider struct {
	ID          uint           `gorm:"primaryKey,autoIncrement"`
	Name        string         `gorm:"size:100;not null"`
	Type        AIProviderType `gorm:"size:64;not null"`
	Url         string         `gorm:"size:255"`
	ApiKey      string         `gorm:"size:2048;not null"`
	Model       string         `gorm:"size:128;not null"`
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
