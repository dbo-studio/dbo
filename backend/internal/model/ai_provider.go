package model

import "time"

type AiProvider struct {
	ID                     uint           `gorm:"primaryKey,autoIncrement"`
	Type                   AIProviderType `gorm:"size:64;not null"`
	Url                    string         `gorm:"size:255"`
	ApiKey                 *string        `gorm:"size:2048"`
	Timeout                int
	Models                 []string `gorm:"type:json;serializer:json"`
	IsActive               bool     `gorm:"default:false"`
	Model                  string   `gorm:"size:50"`
	LastModelListUpdatedAt *time.Time
	LastUsedAt             time.Time
	CreatedAt              *time.Time `gorm:"autoCreateTime"`
	UpdatedAt              *time.Time `gorm:"autoUpdateTime"`
}

type AIProviderType string

const (
	AIProviderTypeOpenAI    AIProviderType = "openai"
	AIProviderTypeAnthropic AIProviderType = "anthropic"
	AIProviderTypeGemini    AIProviderType = "gemini"
	AIProviderTypeGroq      AIProviderType = "groq"
	AIProviderTypeOllama    AIProviderType = "ollama"
)
