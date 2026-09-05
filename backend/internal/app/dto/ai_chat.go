package dto

import "github.com/dbo-studio/dbo/internal/database/contract"

type (
	AiChatRequest    = databaseContract.AiChatRequest
	AiContextOptions = databaseContract.AiContextOptions

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
	}
)
