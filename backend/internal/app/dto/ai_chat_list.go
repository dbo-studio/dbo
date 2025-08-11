package dto

import "time"

type (
	AiChatListResponse struct {
		Chats []AiChatItem
	}
)

type (
	AiChatItem struct {
		ID        uint      `json:"id"`
		Title     string    `json:"title"`
		CreatedAt time.Time `json:"createdAt"`
	}
)
