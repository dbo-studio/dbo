package aichat

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"
)

func aiChatToResponse(chats *[]model.AiChat) *dto.AiChatListResponse {
	result := make([]dto.AiChatItem, len(lo.FromPtr(chats)))
	for i, chat := range lo.FromPtr(chats) {
		result[i] = dto.AiChatItem{
			ID:        chat.ID,
			Title:     chat.Title,
			CreatedAt: chat.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	return &dto.AiChatListResponse{
		Chats: result,
	}
}

func aiChatDetailToResponse(chat *model.AiChat) *dto.AiChatDetailResponse {
	messages := make([]dto.AiMessage, len(chat.Messages))
	for i, message := range chat.Messages {
		messages[i] = dto.AiMessage{
			Role:      string(message.Role),
			Content:   message.Content,
			Type:      string(message.Type),
			Language:  string(message.Language),
			CreatedAt: message.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	return &dto.AiChatDetailResponse{
		ID:        chat.ID,
		Title:     chat.Title,
		CreatedAt: chat.CreatedAt.Format("2006-01-02 15:04:05"),
		Messages:  messages,
	}
}
