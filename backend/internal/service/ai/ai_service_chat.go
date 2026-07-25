package serviceAi

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *AiServiceImpl) Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error) {
	provider, dbProvider, err := s.createProvider(ctx)
	if err != nil {
		return nil, err
	}

	chat, err := s.findChat(ctx, req)
	if err != nil {
		return nil, err
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewAIContextRepository(ctx, conn, s.cm)
	if err != nil {
		return nil, err
	}

	contextStr, err := repo.AiContext(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.updateChatTitle(ctx, chat, req.Message); err != nil {
		return nil, err
	}

	chat.Messages = append(chat.Messages, model.AiChatMessage{
		Role:    model.AiChatMessageRoleUser,
		Content: req.Message,
	})

	providerReq := buildProviderChatRequest(chat, dbProvider.Model, contextStr, req, true)

	providerResp, providerResErr := provider.Chat(ctx, providerReq)

	if err := s.saveChatMessages(ctx, chat, req.Message, providerResp); err != nil {
		s.logger.Error(fmt.Sprintf("Failed to save chat messages: %v", err))
	}

	if providerResErr != nil {
		return nil, providerResErr
	}

	response := &dto.AiChatResponse{
		ChatID: chat.ID,
		Title:  chat.Title,
	}

	if len(providerResp.Contents) == 0 {
		response.Messages = append(response.Messages, dto.AiMessage{
			Role:      string(providerResp.Role),
			Content:   providerResp.Content,
			Type:      string(providerResp.Type),
			Language:  string(providerResp.Language),
			CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
		})
	}

	for _, content := range providerResp.Contents {
		response.Messages = append(response.Messages, dto.AiMessage{
			Role:      string(providerResp.Role),
			Content:   content.Content,
			Type:      string(content.Type),
			Language:  string(content.Language),
			CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
		})
	}

	return response, nil
}
