package dto

import "time"

type (
	AiChatDetailRequest struct {
		AiChatId uint
	}

	AiChatDetailResponse struct {
		ID        uint        `json:"id"`
		Title     string      `json:"title"`
		CreatedAt time.Time   `json:"createdAt"`
		Messages  []AiMessage `json:"messages"`
	}
)
